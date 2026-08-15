package com.contextdefine.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "app_user", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
@Getter
@Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private int usageCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Plan plan = Plan.FREE;

    // Set once the user starts a subscription; identifies them in Razorpay
    // webhook events and lets us call the cancel API later.
    @Column(unique = true)
    private String razorpaySubscriptionId;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
