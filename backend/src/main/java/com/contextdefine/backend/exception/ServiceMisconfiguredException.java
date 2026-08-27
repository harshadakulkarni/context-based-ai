package com.contextdefine.backend.exception;

/** A feature that depends on an external service (Google sign-in, etc.) whose credentials aren't set. */
public class ServiceMisconfiguredException extends RuntimeException {
    public ServiceMisconfiguredException(String message) {
        super(message);
    }
}
