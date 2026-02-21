package com.splitsmart.splitsmart_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SplitsmartBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(SplitsmartBackendApplication.class, args);
        System.out.println("🚀 SplitSmart Backend Running on http://localhost:8080");
        System.out.println("📖 Swagger UI: http://localhost:8080/swagger-ui.html");
    }
}
