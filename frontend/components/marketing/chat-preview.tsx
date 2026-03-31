"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Bot, SendHorizonal } from "lucide-react";

export function ChatPreview() {
  return (
    <div className="marketing-glass relative overflow-hidden rounded-[28px] p-5 shadow-[0_24px_60px_rgba(249,115,22,0.14)] sm:p-6">
      <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-amber-100 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">AI Recruiting Assistant</p>
            <p className="mt-1 text-sm text-slate-500">Find candidates, compare fits, and speed up screening.</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-[0_12px_24px_rgba(249,115,22,0.24)]">
            <Bot className="h-5 w-5" />
          </div>
        </div>

        <div className="space-y-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="ml-auto max-w-[85%] rounded-[22px] rounded-tr-md bg-slate-900 px-4 py-3 text-sm text-white shadow-sm"
          >
            Find me a frontend developer
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="max-w-[88%] rounded-[22px] rounded-tl-md bg-orange-50 px-4 py-4 text-sm text-slate-700 shadow-sm"
          >
            <p className="font-medium text-slate-900">Here are 5 top matches.</p>
            <ul className="mt-3 space-y-2 text-slate-600">
              <li className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2">
                <span>React + TypeScript + Next.js</span>
                <ArrowUpRight className="h-4 w-4 text-orange-500" />
              </li>
              <li className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2">
                <span>Frontend lead with fintech background</span>
                <ArrowUpRight className="h-4 w-4 text-orange-500" />
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.25 }}
            className="flex items-center gap-2 px-1"
          >
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange-400" />
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange-300 [animation-delay:120ms]" />
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange-200 [animation-delay:220ms]" />
            <span className="ml-2 text-sm text-slate-500">AI is typing…</span>
          </motion.div>
        </div>

        <div className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <input
            readOnly
            value="Ask about skills, location, or job fit"
            className="w-full bg-transparent text-sm text-slate-500 outline-none"
          />
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-[0_12px_24px_rgba(249,115,22,0.24)]"
            aria-label="Send message"
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
