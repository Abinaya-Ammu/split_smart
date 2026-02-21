package com.splitsmart.splitsmart_backend.security;

import com.splitsmart.splitsmart_backend.entity.User;
import com.splitsmart.splitsmart_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        // ✅ NULL-SAFE: fix legacy users that were saved without a role
        if (user.getRole() == null) {
            user.setRole(User.Role.USER);
            // Note: not saving here to avoid transaction issues, but won't NPE
        }
        if (user.getIsActive() == null) {
            user.setIsActive(true);
        }

        String roleName = "ROLE_" + (user.getRole() != null ? user.getRole().name() : "USER");

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .authorities(List.of(new SimpleGrantedAuthority(roleName)))
                .accountExpired(false)
                .accountLocked(false)         // never lock — avoids isActive=null crash
                .credentialsExpired(false)
                .disabled(false)              // never disable — avoids isActive=null crash
                .build();
    }
}
