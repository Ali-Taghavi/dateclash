"use client";

import Image from "next/image";
import { Linkedin, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export function AboutSection() {
  return (
    <div className={cn(
      "pt-12 pb-8",
      "bg-muted/30 rounded-lg p-8"
    )}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Profile Image with Teal Ring */}
          <div className="rounded-full p-2 bg-[var(--teal-primary)] flex-shrink-0">
            <Image
              src="https://res.cloudinary.com/mergelabs-io/image/upload/v1751668948/Website%203.0/Ali-Taghavi_oupem4.png"
              alt="Ali Taghavi"
              width={150}
              height={150}
              className="rounded-full object-cover"
            />
          </div>

          {/* Text Content and CTA */}
          <div className="flex-1 space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Hi, I'm Ali Taghavi.</h2>
              <div className="space-y-3 text-foreground/80 leading-relaxed">
                <p>
                  I created DateClash because I was tired of cross-referencing giant spreadsheets just to find a safe slot for my events.
                </p>
                <p>
                  But finding the date is only the first step. For everything that follows—the complex schedules, the runsheets, and the team coordination—we've built{" "}
                  <a
                    href="https://www.mergelabs.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--teal-primary)] hover:underline font-medium"
                  >
                    MergeLabs
                  </a>
                  .
                </p>
                <p>
                  It is the "Event Intelligence Layer" I always wished I had as a producer.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <a
                href="https://www.mergelabs.io/"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "px-6 py-3 rounded-md font-medium text-white",
                  "bg-[var(--teal-primary)] hover:bg-[var(--teal-dark)]",
                  "transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--teal-primary)]/20"
                )}
              >
                Visit MergeLabs.io
              </a>

              <div className="flex items-center gap-4">
                <a
                  href="https://www.linkedin.com/in/ali-taghavi-li/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "text-foreground/70 hover:text-foreground",
                    "transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-foreground/20 rounded"
                  )}
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                <a
                  href="mailto:taghavi@mergelabs.io"
                  className={cn(
                    "text-foreground/70 hover:text-foreground",
                    "transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-foreground/20 rounded"
                  )}
                  aria-label="Email"
                >
                  <Mail className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
