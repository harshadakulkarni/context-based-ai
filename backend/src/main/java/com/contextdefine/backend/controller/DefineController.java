package com.contextdefine.backend.controller;

import com.contextdefine.backend.dto.DefineDtos.DefineRequest;
import com.contextdefine.backend.dto.DefineDtos.DefineResponse;
import com.contextdefine.backend.model.User;
import com.contextdefine.backend.service.OpenAiService;
import com.contextdefine.backend.service.UsageService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/define")
public class DefineController {

    private final OpenAiService openAiService;
    private final UsageService usageService;

    public DefineController(OpenAiService openAiService, UsageService usageService) {
        this.openAiService = openAiService;
        this.usageService = usageService;
    }

    @PostMapping
    public DefineResponse define(@AuthenticationPrincipal User user, @Valid @RequestBody DefineRequest request) {
        usageService.checkLimit(user);
        DefineResponse response = openAiService.fetchDefinition(request);
        if (response.ok()) {
            usageService.increment(user);
        }
        return response;
    }
}
