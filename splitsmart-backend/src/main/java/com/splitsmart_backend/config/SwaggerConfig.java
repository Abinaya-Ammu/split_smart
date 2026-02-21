package com.splitsmart.splitsmart_backend.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "SplitSmart API",
                version = "1.0",
                description = "🚀 AI-Powered Expense Splitter Backend API\n\n"
                + "Features: JWT Auth, 5 Split Modes, AI Insights, "
                + "Settlement Algorithm, UPI Payment Links"
        )
)
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT"
)
public class SwaggerConfig {
}
