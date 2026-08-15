package com.contextdefine.backend.controller;

import com.contextdefine.backend.dto.AuthDtos.*;
import com.contextdefine.backend.model.User;
import com.contextdefine.backend.service.AuthService;
import com.contextdefine.backend.service.UsageService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UsageService usageService;

    public AuthController(AuthService authService, UsageService usageService) {
        this.authService = authService;
        this.usageService = usageService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal User user) {
        return new MeResponse(user.getEmail(), user.getUsageCount(), usageService.getLimitFor(user), user.getPlan().name());
    }
}
