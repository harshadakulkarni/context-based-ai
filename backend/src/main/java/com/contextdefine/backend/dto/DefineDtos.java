package com.contextdefine.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class DefineDtos {

    public record DefineRequest(
            @NotBlank String word,
            String context,
            String pageTitle,
            String pageUrl,
            String language
    ) {}

    public record DefineResponse(
            boolean ok,
            String definition,
            String model,
            String error,
            String message
    ) {
        public static DefineResponse success(String definition, String model) {
            return new DefineResponse(true, definition, model, null, null);
        }

        public static DefineResponse failure(String error, String message) {
            return new DefineResponse(false, null, null, error, message);
        }
    }

    public record UsageResponse(
            int used,
            int limit,
            String plan
    ) {}
}
