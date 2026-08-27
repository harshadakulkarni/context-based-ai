package com.contextdefine.backend.service;

import com.contextdefine.backend.dto.DefineDtos.DefineRequest;
import com.contextdefine.backend.dto.DefineDtos.DefineResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Service
public class OpenAiService {

    private static final String SYSTEM_PROMPT =
            "You are a concise dictionary assistant embedded in a browser extension. " +
            "Given a word/phrase and the sentence it appears in, return the meaning of that " +
            "word/phrase AS USED IN THAT SPECIFIC CONTEXT (not every possible dictionary sense). " +
            "Keep it short. Format your answer in plain text with these parts: " +
            "1) A one-line definition fitted to the context. " +
            "2) Part of speech in parentheses if relevant. " +
            "3) If the word is unusual, technical, or could be confused, add one short clarifying note. " +
            "Do not repeat the whole sentence back. Do not add greetings or sign-offs. " +
            "If the word is a common, simple word (e.g. 'the', 'and', 'is'), still give a brief honest answer.";

    // Used when the user asks for "more detail" on a definition they've already seen —
    // same word/context, but a longer, richer answer instead of the compact default.
    private static final String DETAILED_SYSTEM_PROMPT =
            "You are a knowledgeable dictionary and language assistant embedded in a browser extension. " +
            "The user has already seen a brief definition of a word/phrase as used in a specific sentence, " +
            "and now wants more depth on it. Given the word/phrase and the sentence it appears in, provide a " +
            "richer explanation covering, where genuinely relevant: " +
            "1) A fuller definition of this specific contextual sense. " +
            "2) Word origin/etymology, briefly. " +
            "3) One or two other common senses of the word, if it's polysemous, clearly distinguished from the " +
            "sense used here. " +
            "4) A short list of synonyms or closely related words. " +
            "5) A second example sentence using the word in a similar sense. " +
            "Format in plain text with clear line breaks between parts — do not use markdown symbols like ** or #. " +
            "Do not repeat the original sentence verbatim as your example. Do not add greetings or sign-offs.";

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public OpenAiService(
            @Value("${app.openai.api-key}") String apiKey,
            @Value("${app.openai.model}") String model
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .build();
    }

    public DefineResponse fetchDefinition(DefineRequest request) {
        if (apiKey == null || apiKey.isBlank()) {
            return DefineResponse.failure("server_misconfigured", "Server is not configured with an OpenAI API key");
        }

        boolean detailed = Boolean.TRUE.equals(request.detailed());
        String userPrompt = buildUserPrompt(request);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", detailed ? DETAILED_SYSTEM_PROMPT : SYSTEM_PROMPT),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "temperature", 0.3,
                "max_tokens", detailed ? 550 : 220
        );

        try {
            Map<?, ?> response = restClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            String text = extractText(response);
            if (text == null || text.isBlank()) {
                return DefineResponse.failure("empty_response", "The model returned an empty response");
            }
            return DefineResponse.success(text.trim(), model);

        } catch (RestClientResponseException e) {
            return DefineResponse.failure("api_error", "OpenAI API error (" + e.getStatusCode().value() + ")");
        } catch (Exception e) {
            return DefineResponse.failure("network_error", "Could not reach OpenAI: " + e.getMessage());
        }
    }

    private String buildUserPrompt(DefineRequest request) {
        StringBuilder sb = new StringBuilder();
        sb.append("Word/phrase to define: \"").append(request.word()).append("\"\n\n");
        sb.append("Sentence/context it appeared in: \"").append(request.context()).append("\"\n\n");
        if (request.pageTitle() != null && !request.pageTitle().isBlank()) {
            sb.append("Page title: ").append(request.pageTitle()).append("\n");
        }
        if (request.pageUrl() != null && !request.pageUrl().isBlank()) {
            sb.append("Page URL: ").append(request.pageUrl()).append("\n");
        }
        if (request.language() != null && !request.language().isBlank()
                && !request.language().equalsIgnoreCase("english")) {
            sb.append("\nRespond entirely in ").append(request.language())
                    .append(" (translate the definition itself, not just add a translation alongside it).\n");
        }
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<?, ?> response) {
        if (response == null) return null;
        Object choices = response.get("choices");
        if (!(choices instanceof List<?> list) || list.isEmpty()) return null;
        Object first = list.get(0);
        if (!(first instanceof Map<?, ?> choice)) return null;
        Object message = choice.get("message");
        if (!(message instanceof Map<?, ?> messageMap)) return null;
        Object content = messageMap.get("content");
        return content instanceof String ? (String) content : null;
    }
}
