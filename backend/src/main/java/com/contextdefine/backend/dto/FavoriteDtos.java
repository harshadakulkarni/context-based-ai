package com.contextdefine.backend.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public class FavoriteDtos {

    public record FavoriteRequest(
            @NotBlank String term,
            String context,
            @NotBlank String definition,
            String language,
            String pageTitle,
            String pageUrl
    ) {}

    public record FavoriteResponse(
            Long id,
            String term,
            String context,
            String definition,
            String language,
            String pageTitle,
            String pageUrl,
            Instant createdAt
    ) {}
}
