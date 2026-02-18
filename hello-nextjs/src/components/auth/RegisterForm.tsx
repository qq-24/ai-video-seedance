"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function RegisterForm() {
  const router = useRouter();

  useEffect(() => {
    // 单用户模式，不需要注册，直接重定向到登录页
    router.push("/login");
  }, [router]);

  return (
    <div className="space-y-6">
      <div className="rounded-md bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          单用户本地模式，无需注册账号。
        </p>
      </div>
      <p className="text-center text-sm text-gray-600">
        跳转到登录页面...
      </p>
      <p className="text-center">
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          点击此处手动跳转
        </Link>
      </p>
    </div>
  );
}
