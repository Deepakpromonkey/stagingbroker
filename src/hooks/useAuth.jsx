"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";  
 
export function useAuth() {
    const router = useRouter();
    const [user,  setUser]  = useState(null);
    const [token, setToken] = useState(null);
    const [ready, setReady] = useState(false);
 
    useEffect(() => {
        const storedToken = localStorage.getItem("crm_auth_token");
        const storedUser  = localStorage.getItem("crm_user");
 
        if (!storedToken) {
            router.push("/login");
            return;
        }
        setToken(storedToken);
 
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser({
                    ...parsed,
                    role: parsed.role?.toLowerCase() ?? "employee",
                    name: parsed.employeeProfile?.legalName ?? parsed.name ?? parsed.email?.split("@")[0] ?? "User",
                    permissions: parsed.permissions || {}
                });
            } catch {
                setUser(null);
            }
        }
        setReady(true);
 
        fetch(`${API_BASE}/api/auth/me`, {
            headers: { "Authorization": `Bearer ${storedToken}` }
        })
        .then(res => res.json())
        .then(json => {
            if (json.status === "success" && json.data) {
                const freshUser = json.data;
                const normalized = {
                    ...freshUser,
                    role: freshUser.role?.toLowerCase() ?? "employee",
                    name: freshUser.employeeProfile?.legalName ?? freshUser.name ?? freshUser.email?.split("@")[0] ?? "User",
                };
                
                setUser(normalized);
                
                localStorage.setItem("crm_user", JSON.stringify(normalized));
            }
        })
        .catch(err => console.error("Background sync failed", err));
 
    }, []);  
 
    function logout() {
        localStorage.removeItem("crm_auth_token");
        localStorage.removeItem("crm_user");
        localStorage.removeItem("crm_employee");
        localStorage.removeItem("crm_modules");
        document.cookie = "crm_auth_token=; path=/; max-age=0; SameSite=Lax";
        router.push("/login");
    }
 
    return { user, token, ready, logout };
}