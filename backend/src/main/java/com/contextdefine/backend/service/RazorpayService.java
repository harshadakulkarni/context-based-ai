package com.contextdefine.backend.service;

import com.contextdefine.backend.exception.BillingException;
import com.contextdefine.backend.model.Plan;
import com.contextdefine.backend.model.User;
import com.contextdefine.backend.repository.UserRepository;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Subscription;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class RazorpayService {

    // Razorpay subscriptions require a finite total_count (billing-cycle count) —
    // there's no native "until cancelled" option. 1200 monthly cycles (~100 years,
    // Razorpay's max) is the standard way to model "indefinite until the user cancels".
    private static final int MONTHLY_CYCLES_UNTIL_MAX = 1200;

    private final UserRepository userRepository;
    private final String keyId;
    private final String keySecret;
    private final String webhookSecret;
    private final String planId;

    public RazorpayService(
            UserRepository userRepository,
            @Value("${app.razorpay.key-id}") String keyId,
            @Value("${app.razorpay.key-secret}") String keySecret,
            @Value("${app.razorpay.webhook-secret}") String webhookSecret,
            @Value("${app.razorpay.plan-id}") String planId
    ) {
        this.userRepository = userRepository;
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.webhookSecret = webhookSecret;
        this.planId = planId;
    }

    private RazorpayClient client() {
        if (keyId == null || keyId.isBlank() || keySecret == null || keySecret.isBlank()
                || planId == null || planId.isBlank()) {
            throw new BillingException("Server is not configured with Razorpay credentials");
        }
        try {
            return new RazorpayClient(keyId, keySecret);
        } catch (RazorpayException e) {
            throw new BillingException("Could not reach Razorpay: " + e.getMessage(), e);
        }
    }

    /** Creates a subscription and returns the hosted payment page URL to send the user to. */
    public String createSubscription(User user) {
        RazorpayClient client = client();

        // For visibility in the Razorpay dashboard only — the webhook identifies the
        // user via razorpaySubscriptionId (set below), not via these notes.
        JSONObject notes = new JSONObject();
        notes.put("userId", String.valueOf(user.getId()));

        JSONObject request = new JSONObject();
        request.put("plan_id", planId);
        request.put("total_count", MONTHLY_CYCLES_UNTIL_MAX);
        request.put("quantity", 1);
        request.put("customer_notify", true);
        request.put("notes", notes);

        try {
            Subscription subscription = client.subscriptions.create(request);
            String subscriptionId = subscription.get("id");
            user.setRazorpaySubscriptionId(subscriptionId);
            userRepository.save(user);
            return subscription.get("short_url");
        } catch (RazorpayException e) {
            throw new BillingException("Could not start subscription: " + e.getMessage(), e);
        }
    }

    /** Cancels at Razorpay; the plan itself flips back to FREE when the webhook confirms it. */
    public void cancelSubscription(User user) {
        if (user.getRazorpaySubscriptionId() == null || user.getRazorpaySubscriptionId().isBlank()) {
            throw new BillingException("No active subscription to cancel");
        }
        RazorpayClient client = client();
        try {
            client.subscriptions.cancel(user.getRazorpaySubscriptionId(), new JSONObject());
        } catch (RazorpayException e) {
            throw new BillingException("Could not cancel subscription: " + e.getMessage(), e);
        }
    }

    /** Verifies the webhook signature, then flips the relevant user's plan. */
    public void handleWebhook(String payload, String signature) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            throw new BillingException("Server is not configured with a Razorpay webhook secret");
        }

        boolean valid;
        try {
            valid = Utils.verifyWebhookSignature(payload, signature, webhookSecret);
        } catch (RazorpayException e) {
            throw new BillingException("Invalid Razorpay webhook signature");
        }
        if (!valid) {
            throw new BillingException("Invalid Razorpay webhook signature");
        }

        JSONObject body = new JSONObject(payload);
        String event = body.optString("event", "");

        JSONObject payloadObj = body.optJSONObject("payload");
        JSONObject subscriptionObj = payloadObj != null ? payloadObj.optJSONObject("subscription") : null;
        JSONObject entity = subscriptionObj != null ? subscriptionObj.optJSONObject("entity") : null;
        if (entity == null) return;

        String subscriptionId = entity.optString("id", null);
        if (subscriptionId == null) return;

        switch (event) {
            case "subscription.activated", "subscription.charged" ->
                    userRepository.findByRazorpaySubscriptionId(subscriptionId).ifPresent(user -> {
                        user.setPlan(Plan.PRO);
                        userRepository.save(user);
                    });
            case "subscription.cancelled", "subscription.completed", "subscription.halted" ->
                    userRepository.findByRazorpaySubscriptionId(subscriptionId).ifPresent(user -> {
                        user.setPlan(Plan.FREE);
                        userRepository.save(user);
                    });
            default -> { /* not a plan-changing event — ignore */ }
        }
    }
}
