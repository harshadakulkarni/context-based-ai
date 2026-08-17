package com.contextdefine.backend.controller;

import com.contextdefine.backend.dto.FavoriteDtos.FavoriteRequest;
import com.contextdefine.backend.dto.FavoriteDtos.FavoriteResponse;
import com.contextdefine.backend.model.User;
import com.contextdefine.backend.service.FavoriteService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    private final FavoriteService favoriteService;

    public FavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }

    @PostMapping
    public FavoriteResponse create(@AuthenticationPrincipal User user, @Valid @RequestBody FavoriteRequest request) {
        return favoriteService.create(user, request);
    }

    @GetMapping
    public List<FavoriteResponse> list(@AuthenticationPrincipal User user) {
        return favoriteService.list(user);
    }

    @DeleteMapping("/{id}")
    public void delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        favoriteService.delete(user, id);
    }
}
