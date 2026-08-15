package com.contextdefine.backend.controller;

import com.contextdefine.backend.dto.BillingDtos.CancelResponse;
import com.contextdefine.backend.dto.BillingDtos.SubscriptionResponse;
import com.contextdefine.backend.model.User;
import com.contextdefine.backend.service.RazorpayService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private final RazorpayService razorpayService;

    public BillingController(RazorpayService razorpayService) {
        this.razorpayService = razorpayService;
    }

    @PostMapping("/checkout")
    public SubscriptionResponse checkout(@AuthenticationPrincipal User user) {
        return new SubscriptionResponse(razorpayService.createSubscription(user));
    }

    @PostMapping("/cancel")
    public CancelResponse cancel(@AuthenticationPrincipal User user) {
        razorpayService.cancelSubscription(user);
        return new CancelResponse(true);
    }

    // Called by Razorpay directly, not the browser — no JWT, so it's permitAll()'d in
    // SecurityConfig. Signature verification (via the raw body + header below) is what
    // proves the request actually came from Razorpay.
    @PostMapping("/webhook")
    public void webhook(@RequestBody String payload, @RequestHeader("X-Razorpay-Signature") String signature) {
        razorpayService.handleWebhook(payload, signature);
    }
}
