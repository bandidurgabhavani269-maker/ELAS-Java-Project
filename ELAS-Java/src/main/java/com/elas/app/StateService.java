package com.elas.app;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class StateService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final Map<String, SessionUser> sessions = new ConcurrentHashMap<>();

    public StateService(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @PostConstruct
    public void initialize() throws Exception {
        java.nio.file.Files.createDirectories(java.nio.file.Path.of("data"));
        jdbc.execute("CREATE TABLE IF NOT EXISTS elas_state (id INT PRIMARY KEY, payload CLOB NOT NULL)");
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM elas_state WHERE id=1", Integer.class);
        if (count == null || count == 0) {
            try (InputStream input = new ClassPathResource("seed-data.json").getInputStream()) {
                String json = new String(input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                jdbc.update("INSERT INTO elas_state(id,payload) VALUES(1,?)", json);
            }
        }
    }

    public LoginResult login(String email, String password) throws Exception {
        ObjectNode state = readState();
        if ("admin@elas.com".equalsIgnoreCase(email) && "admin123".equals(password)) {
            SessionUser user = new SessionUser("ADMIN", "Admin", "admin@elas.com", "admin");
            String token = UUID.randomUUID().toString();
            sessions.put(token, user);
            return new LoginResult(token, user);
        }
        for (JsonNode employee : state.withArray("employees")) {
            if (employee.path("email").asText().equalsIgnoreCase(email)
                    && employee.path("password").asText().equals(password)) {
                SessionUser user = new SessionUser(employee.path("id").asText(), employee.path("name").asText(),
                        employee.path("email").asText(), "employee");
                String token = UUID.randomUUID().toString();
                sessions.put(token, user);
                return new LoginResult(token, user);
            }
        }
        throw new IllegalArgumentException("Incorrect email or password.");
    }

    public SessionUser requireUser(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer "))
            throw new SecurityException("Please sign in again.");
        SessionUser user = sessions.get(authorization.substring(7));
        if (user == null) throw new SecurityException("Your session has expired. Please sign in again.");
        return user;
    }

    public void logout(String authorization) {
        if (authorization != null && authorization.startsWith("Bearer ")) sessions.remove(authorization.substring(7));
    }

    public ObjectNode getVisibleState(SessionUser user) throws Exception {
        ObjectNode full = readState();
        if ("admin".equals(user.role())) return full;
        ObjectNode visible = mapper.createObjectNode();
        ArrayNode employees = mapper.createArrayNode();
        for (JsonNode employee : full.withArray("employees")) if (user.id().equals(employee.path("id").asText())) employees.add(employee);
        visible.set("employees", employees);
        ArrayNode attendance = mapper.createArrayNode();
        for (JsonNode row : full.withArray("attendance")) if (user.id().equals(row.path("employeeId").asText())) attendance.add(row);
        visible.set("attendance", attendance);
        ArrayNode leaves = mapper.createArrayNode();
        for (JsonNode row : full.withArray("leaves")) if (user.id().equals(row.path("employeeId").asText())) leaves.add(row);
        visible.set("leaves", leaves);
        ArrayNode projects = mapper.createArrayNode();
        for (JsonNode project : full.withArray("projects")) {
            boolean assigned = false;
            for (JsonNode id : project.withArray("assigned")) if (user.id().equals(id.asText())) assigned = true;
            if (assigned) projects.add(project);
        }
        visible.set("projects", projects);
        return visible;
    }

    public synchronized void updateState(SessionUser user, JsonNode incoming) throws Exception {
        if (!incoming.isObject()) throw new IllegalArgumentException("Invalid application data.");
        if ("admin".equals(user.role())) {
            jdbc.update("UPDATE elas_state SET payload=? WHERE id=1", mapper.writeValueAsString(incoming));
            return;
        }
        ObjectNode full = readState();
        JsonNode incomingEmployee = null;
        for (JsonNode employee : incoming.path("employees"))
            if (user.id().equals(employee.path("id").asText())) incomingEmployee = employee;
        if (incomingEmployee != null) {
            for (JsonNode employee : full.withArray("employees")) {
                if (user.id().equals(employee.path("id").asText()) && employee instanceof ObjectNode target) {
                    copyIfPresent(incomingEmployee, target, "qualification");
                    copyIfPresent(incomingEmployee, target, "skills");
                    copyIfPresent(incomingEmployee, target, "talent");
                    copyIfPresent(incomingEmployee, target, "level");
                    copyIfPresent(incomingEmployee, target, "resumeData");
                    copyIfPresent(incomingEmployee, target, "resumeName");
                }
            }
        }
        ArrayNode attendance = full.withArray("attendance");
        for (int i = attendance.size() - 1; i >= 0; i--)
            if (user.id().equals(attendance.get(i).path("employeeId").asText())) attendance.remove(i);
        for (JsonNode row : incoming.path("attendance"))
            if (user.id().equals(row.path("employeeId").asText())) attendance.add(row);

        ArrayNode leaves = full.withArray("leaves");
        for (JsonNode row : incoming.path("leaves")) {
            if (!user.id().equals(row.path("employeeId").asText())) continue;
            boolean exists = false;
            for (JsonNode old : leaves) if (old.path("id").asText().equals(row.path("id").asText())) exists = true;
            if (!exists) {
                ObjectNode safe = ((ObjectNode) row).deepCopy();
                safe.put("status", "Pending");
                safe.put("remarks", "");
                leaves.add(safe);
            }
        }

        for (JsonNode incomingProject : incoming.path("projects")) {
            String projectId = incomingProject.path("id").asText();
            for (JsonNode storedProject : full.withArray("projects")) {
                if (!projectId.equals(storedProject.path("id").asText()) || !(storedProject instanceof ObjectNode target)) continue;
                boolean assigned = false;
                for (JsonNode id : target.withArray("assigned")) if (user.id().equals(id.asText())) assigned = true;
                if (!assigned) continue;
                JsonNode newProgress = incomingProject.path("progress").path(user.id());
                if (!newProgress.isMissingNode()) {
                    ObjectNode progress = target.with("progress");
                    progress.set(user.id(), newProgress.deepCopy());
                }
            }
        }
        jdbc.update("UPDATE elas_state SET payload=? WHERE id=1", mapper.writeValueAsString(full));
    }

    private void copyIfPresent(JsonNode source, ObjectNode target, String field) {
        if (source.has(field)) target.set(field, source.get(field).deepCopy());
    }

    private ObjectNode readState() throws Exception {
        String json = jdbc.queryForObject("SELECT payload FROM elas_state WHERE id=1", String.class);
        return (ObjectNode) mapper.readTree(json);
    }

    public record SessionUser(String id, String name, String email, String role) {}
    public record LoginResult(String token, SessionUser user) {}
}
