package com.contextdefine.backend.service;

import com.contextdefine.backend.dto.AuthDtos.AuthResponse;
import com.contextdefine.backend.dto.AuthDtos.LoginRequest;
import com.contextdefine.backend.dto.AuthDtos.RegisterRequest;
import com.contextdefine.backend.exception.ServiceMisconfiguredException;
import com.contextdefine.backend.model.User;
import com.contextdefine.backend.repository.UserRepository;
import com.contextdefine.backend.security.JwtService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final String googleClientId;
    private GoogleIdTokenVerifier googleVerifier;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${app.google.client-id}") String googleClientId
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleClientId = googleClientId;
    }

    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("An account with this email already exists");
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);

        return new AuthResponse(jwtService.generateToken(email), email);
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        return new AuthResponse(jwtService.generateToken(email), email);
    }

    /** Verifies a Google ID token, then finds or creates the matching account. */
    public AuthResponse loginWithGoogle(String idTokenString) {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new ServiceMisconfiguredException("Server is not configured for Google sign-in");
        }

        GoogleIdToken.Payload payload = verifyGoogleToken(idTokenString);
        if (payload == null) {
            throw new BadCredentialsException("Invalid Google sign-in");
        }
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new BadCredentialsException("Google account email is not verified");
        }

        String email = payload.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User created = new User();
            created.setEmail(email);
            // Google-authenticated accounts have no password of their own; store an
            // unguessable, unusable hash so the passwordHash NOT NULL column stays
            // satisfied without a schema change or a special-cased nullable column.
            created.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            userRepository.save(created);
            return created;
        });

        return new AuthResponse(jwtService.generateToken(email), email);
    }

    private GoogleIdToken.Payload verifyGoogleToken(String idTokenString) {
        try {
            GoogleIdToken idToken = googleVerifier().verify(idTokenString);
            return idToken == null ? null : idToken.getPayload();
        } catch (GeneralSecurityException | IOException | IllegalArgumentException e) {
            return null;
        }
    }

    private synchronized GoogleIdTokenVerifier googleVerifier() {
        if (googleVerifier == null) {
            googleVerifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();
        }
        return googleVerifier;
    }
}
