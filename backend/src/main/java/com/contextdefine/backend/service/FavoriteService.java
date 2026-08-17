package com.contextdefine.backend.service;

import com.contextdefine.backend.dto.FavoriteDtos.FavoriteRequest;
import com.contextdefine.backend.dto.FavoriteDtos.FavoriteResponse;
import com.contextdefine.backend.model.Favorite;
import com.contextdefine.backend.model.User;
import com.contextdefine.backend.repository.FavoriteRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;

    public FavoriteService(FavoriteRepository favoriteRepository) {
        this.favoriteRepository = favoriteRepository;
    }

    public FavoriteResponse create(User user, FavoriteRequest request) {
        Favorite favorite = new Favorite();
        favorite.setUser(user);
        favorite.setTerm(request.term());
        favorite.setContext(request.context());
        favorite.setDefinition(request.definition());
        favorite.setLanguage(request.language());
        favorite.setPageTitle(request.pageTitle());
        favorite.setPageUrl(request.pageUrl());
        favoriteRepository.save(favorite);
        return toResponse(favorite);
    }

    public List<FavoriteResponse> list(User user) {
        return favoriteRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::toResponse)
                .toList();
    }

    /** No-op if the favorite doesn't exist or belongs to someone else — deletion is always silently idempotent. */
    public void delete(User user, Long id) {
        favoriteRepository.findByIdAndUser(id, user).ifPresent(favoriteRepository::delete);
    }

    private FavoriteResponse toResponse(Favorite favorite) {
        return new FavoriteResponse(
                favorite.getId(),
                favorite.getTerm(),
                favorite.getContext(),
                favorite.getDefinition(),
                favorite.getLanguage(),
                favorite.getPageTitle(),
                favorite.getPageUrl(),
                favorite.getCreatedAt()
        );
    }
}
