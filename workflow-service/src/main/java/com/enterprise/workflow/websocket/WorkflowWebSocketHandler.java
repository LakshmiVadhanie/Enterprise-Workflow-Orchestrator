package com.enterprise.workflow.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class WorkflowWebSocketHandler extends TextWebSocketHandler {

    private final ConcurrentHashMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.put(session.getId(), session);
        log.info("WebSocket connected: {} (total: {})", session.getId(), sessions.size());
        try {
            session.sendMessage(new TextMessage(
                "{\"type\":\"CONNECTED\",\"message\":\"Real-time workflow updates active\",\"sessionId\":\"" + session.getId() + "\"}"
            ));
        } catch (IOException e) {
            log.error("Failed to send welcome message", e);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session.getId());
        log.info("WebSocket disconnected: {} (total: {})", session.getId(), sessions.size());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        log.debug("Received from {}: {}", session.getId(), message.getPayload());
        // Handle ping/pong or subscription filters
    }

    public void broadcastToAll(String message) {
        sessions.values().removeIf(session -> !session.isOpen());
        sessions.values().forEach(session -> {
            try {
                synchronized (session) {
                    session.sendMessage(new TextMessage(message));
                }
            } catch (IOException e) {
                log.error("Failed to send to session {}: {}", session.getId(), e.getMessage());
            }
        });
    }

    public void sendToSession(String sessionId, String message) {
        WebSocketSession session = sessions.get(sessionId);
        if (session != null && session.isOpen()) {
            try {
                session.sendMessage(new TextMessage(message));
            } catch (IOException e) {
                log.error("Failed to send to session {}", sessionId, e);
            }
        }
    }

    public int getActiveSessionCount() {
        return sessions.size();
    }
}
