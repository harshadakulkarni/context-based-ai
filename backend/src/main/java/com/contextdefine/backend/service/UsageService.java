package com.contextdefine.backend.service;

import com.contextdefine.backend.exception.UsageLimitExceededException;
import com.contextdefine.backend.model.Plan;
import com.contextdefine.backend.model.User;
import com.contextdefine.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class UsageService {

    /** Sentinel returned by getLimitFor() for Pro users — no cap applies. */
    public static final int UNLIMITED = -1;

    private final UserRepository userRepository;
    private final int freeLimit;

    public UsageService(
            UserRepository userRepository,
            @Value("${app.usage.free-limit}") int freeLimit
    ) {
        this.userRepository = userRepository;
        this.freeLimit = freeLimit;
    }

    public int getLimitFor(User user) {
        return user.getPlan() == Plan.PRO ? UNLIMITED : freeLimit;
    }

    /** Throws if a Free-plan user has already used up their lifetime lookups. Pro is uncapped. */
    public void checkLimit(User user) {
        if (user.getPlan() == Plan.PRO) return;

        if (user.getUsageCount() >= freeLimit) {
            throw new UsageLimitExceededException(
                    "Free limit of " + freeLimit + " lookups reached. Upgrade to Pro for unlimited lookups."
            );
        }
    }

    /** Call only after a successful lookup, so failed OpenAI calls don't burn the user's quota. */
    public void increment(User user) {
        user.setUsageCount(user.getUsageCount() + 1);
        userRepository.save(user);
    }
}
