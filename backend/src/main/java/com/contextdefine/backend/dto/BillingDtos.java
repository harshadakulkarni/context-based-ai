package com.contextdefine.backend.dto;

public class BillingDtos {
    public record SubscriptionResponse(String url) {}
    public record CancelResponse(boolean ok) {}
}
