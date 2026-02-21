STEP 1 — MySQL Workbench: run fix_database.sql

STEP 2 — In VS Code backend project, replace these files:
  entity/Group.java
  dto/response/GroupResponse.java  (NEW file — create it)
  service/impl/GroupService.java
  controller/GroupController.java
  service/impl/AuthService.java
  service/impl/EmailService.java
  security/UserDetailsServiceImpl.java
  exception/GlobalExceptionHandler.java
  resources/application.properties  → change your_mysql_password_here

STEP 3 — In VS Code terminal (backend):
  Ctrl+C to stop, then: ./mvnw spring-boot:run

STEP 4 — Replace frontend files:
  src/pages/Dashboard.js
  src/pages/Groups.js
  src/services/api.js

STEP 5 — Frontend already running, just refresh browser
