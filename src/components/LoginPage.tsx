import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Mail, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

import type { ApiResponse, LoginResponseData } from "@/types";

export default function LoginPage({ onLoginSuccess }: { onLoginSuccess: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          expired: trustDevice ? "none" : undefined,
        }),
      });

      const data = (await response.json()) as ApiResponse<LoginResponseData>;

      if (data.success && data.data) {
        localStorage.setItem("auth_token", data.data.token);
        onLoginSuccess(data.data.token);
      } else {
        setError(data.error || "登录失败");
      }
    } catch {
      setError("网络错误,请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-sidebar flex items-center justify-center px-5 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[380px]"
      >
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Mail className="size-5" strokeWidth={1.7} /></span>
          <span className="text-[30px] font-semibold tracking-[-1px]">Alle<span className="text-primary">.</span></span>
        </div>
        <div className="rounded-2xl border bg-card px-7 py-7 shadow-[0_8px_40px_-24px_rgba(38,52,47,0.16)]">
          <h1 className="text-xl font-semibold tracking-tight">欢迎回来</h1>
          <p className="mb-7 mt-2 text-xs text-muted-foreground">登录你的邮箱，让邮件井然有序。</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">用户名</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  className="h-11 bg-muted/30 shadow-none"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="请输入用户名"
                  required
                  disabled={loading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">密码</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="h-11 bg-muted/30 shadow-none"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入密码"
                  required
                  disabled={loading}
                />
              </Field>

              <Field orientation="horizontal">
                <Checkbox
                  id="trustDevice"
                  checked={trustDevice}
                  onCheckedChange={(checked) => setTrustDevice(checked === true)}
                  disabled={loading}
                />
                <FieldLabel htmlFor="trustDevice" className="cursor-pointer select-none">
                  在此设备上保持登录
                </FieldLabel>
              </Field>
            </FieldGroup>

            {error && <FieldError>{error}</FieldError>}

            <Button type="submit" className="mt-2 h-11 w-full" disabled={loading}>
              {loading ? "登录中..." : "登录邮箱"}{!loading && <ArrowRight className="size-4" />}
            </Button>
          </form>
        </div>
      </motion.div>
    </main>
  );
}
