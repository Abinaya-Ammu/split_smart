package com.splitsmart.splitsmart_backend.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupResponse {
    private Long id;
    private String name;
    private String description;
    private String groupIcon;
    private String themeColor;
    private String type;
    private String inviteCode;
    private Boolean isActive;
    private Integer memberCount;
    private String createdByName;
    private LocalDateTime createdAt;
}
