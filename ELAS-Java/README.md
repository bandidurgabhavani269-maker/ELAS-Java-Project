# ELAS+ — Java Full-Stack Employee Management System

This is the Java-based version of the existing ELAS+ project. The existing HTML, CSS and JavaScript interface and its features are retained. The browser-only `localStorage` data layer has been replaced with a Java Spring Boot REST backend and a persistent H2 database.

## Technology used
- Java 17
- Spring Boot (REST API and application server)
- H2 database (stored in the `data` folder; no separate database installation required)
- HTML, CSS and JavaScript (existing user interface)
- Chart.js (existing analytics charts)

## Features retained
- Admin dashboard and employee dashboard
- Admin employee directory and resume/talent directory
- 10 fictional employee demo profiles and professional sample PDF resumes
- Skill-based project matching and employee assignment
- Project completion percentage and hours-worked tracking
- Attendance recording and admin attendance view
- Leave requests, admin approval/rejection and leave balance
- Admin Reports & Analytics for all employees, including project counts, completion and hours
- Employee My Reports restricted to that employee's own report
- CSV export of admin reports
- Existing charts, search, profile editing and resume upload

## Requirements
1. Install JDK 17 or newer.
2. Install Apache Maven 3.8+.
3. In VS Code, install **Extension Pack for Java**.

Check installation in the VS Code terminal:

```powershell
java -version
mvn -version
```

## Run in VS Code (Windows)
1. Extract/open the `ELAS-Java` folder in VS Code.
2. Open **Terminal → New Terminal**.
3. Make sure the terminal is in the folder containing `pom.xml`.
4. Run:

```powershell
mvn spring-boot:run
```

5. Wait until the terminal says that the application has started on port `8080`.
6. Open this address in your browser: `http://localhost:8080`
7. Do **not** open `index.html` with Live Server. The Java server must serve the page so that `/api` requests work.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@elas.com | admin123 |
| Employee 101 | emp101@elas.com | emp123 |
| Employees 102–110 | emp102@elas.com to emp110@elas.com | emp123 |

## Database
The first run creates the database automatically under `data/`. Employee, attendance, leave, project and progress data are saved by the Java server and remain after restarting it. To reset the demo database, stop the server and delete the `data` folder; the next run recreates the original sample records.

## Access control
The Java API checks a signed-in session token on every data request. Admin data requests return the full organisation state. Employee data requests return only their own employee record, attendance, leave records and assigned projects. Employee updates are restricted server-side to their own profile, attendance, leave submissions and project progress.

## Important demo note
The 10 employee names, sample resumes and sample project descriptions are fictional demonstration data. Demo passwords are intentionally simple for classroom assessment. Before real deployment, replace demo credentials with securely hashed passwords, add HTTPS, configure production database backups and review privacy/security requirements.
