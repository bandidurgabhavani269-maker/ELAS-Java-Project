package com.elas.app;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiController {
    private final StateService service;
    public ApiController(StateService service) { this.service = service; }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        try { return ResponseEntity.ok(service.login(body.getOrDefault("email", ""), body.getOrDefault("password", ""))); }
        catch (IllegalArgumentException ex) { return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage())); }
        catch (Exception ex) { return ResponseEntity.internalServerError().body(Map.of("message", "Could not sign in.")); }
    }

    @GetMapping("/state")
    public ResponseEntity<?> getState(@RequestHeader(value="Authorization", required=false) String authorization) {
        try { return ResponseEntity.ok(service.getVisibleState(service.requireUser(authorization))); }
        catch (SecurityException ex) { return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage())); }
        catch (Exception ex) { return ResponseEntity.internalServerError().body(Map.of("message", "Could not load data.")); }
    }

    @PutMapping("/state")
    public ResponseEntity<?> updateState(@RequestHeader(value="Authorization", required=false) String authorization, @RequestBody JsonNode data) {
        try { service.updateState(service.requireUser(authorization), data); return ResponseEntity.ok(Map.of("message", "Saved")); }
        catch (SecurityException ex) { return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage())); }
        catch (Exception ex) { return ResponseEntity.badRequest().body(Map.of("message", "Could not save data.")); }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value="Authorization", required=false) String authorization) {
        service.logout(authorization); return ResponseEntity.ok(Map.of("message", "Logged out"));
    }
}
