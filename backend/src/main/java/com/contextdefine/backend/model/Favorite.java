package com.contextdefine.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "favorite")
@Getter
@Setter
public class Favorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // The saved word/phrase, or the whole sentence when a full sentence was selected.
    @Column(nullable = false, length = 2000)
    private String term;

    // Surrounding sentence the term was found in, for context — same as term when
    // the user selected a full sentence rather than a single word.
    @Column(length = 2000)
    private String context;

    @Column(nullable = false, length = 2000)
    private String definition;

    private String language;

    private String pageTitle;

    @Column(length = 2000)
    private String pageUrl;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
