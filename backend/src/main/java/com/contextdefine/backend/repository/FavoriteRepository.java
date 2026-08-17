package com.contextdefine.backend.repository;

import com.contextdefine.backend.model.Favorite;
import com.contextdefine.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    List<Favorite> findByUserOrderByCreatedAtDesc(User user);
    Optional<Favorite> findByIdAndUser(Long id, User user);
}
