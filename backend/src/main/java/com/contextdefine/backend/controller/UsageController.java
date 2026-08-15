package com.contextdefine.backend.controller;

import com.contextdefine.backend.dto.DefineDtos.UsageResponse;
import com.contextdefine.backend.model.User;
import com.contextdefine.backend.service.UsageService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/usage")
public class UsageController {

    private final UsageService usageService;

    public UsageController(UsageService usageService) {
        this.usageService = usageService;
    }

    @GetMapping
    public UsageResponse usage(@AuthenticationPrincipal User user) {
        return new UsageResponse(user.getUsageCount(), usageService.getLimitFor(user), user.getPlan().name());
    }
}
