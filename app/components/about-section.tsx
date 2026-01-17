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
              <h2 className="text-2xl font-bold">Hi, I&apos;m Ali Taghavi.</h2>
              <div className="space-y-3 text-foreground/80 leading-relaxed">
                <p>
                  I spent 20 years creating events worldwide. Now, I am building a comprehensive Event Intelligence Layer over at{" "}
                  <a
                    href="https://www.mergelabs.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--teal-primary)] hover:underline font-medium"
                  >
                    MergeLabs
                  </a>.
                </p>
                <p>
                  <span className="font-semibold text-foreground">DateClash</span> is an experiment to see how we can create immediate value for you.
                </p>
                <p>
                  But I&apos;m curious: <span className="font-semibold text-foreground">Would you find it valuable to have this data alongside your team availability, venue bookings, and internal training schedules?</span>
                </p>
                <p>
                  That is the level of intelligence we are building into{" "}
                  <a
                    href="https://www.mergelabs.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--teal-primary)] hover:underline font-medium"
                  >
                    MergeLabs
                  </a>
                  {" "}— our Coordination Management Solution that handles all your complex schedules, runsheets, and team logistics.
                </p>
                <p>
                  I&apos;d love to hear what you think about what we&apos;ve built. Please take a look at{" "}
                  <a
                    href="https://www.mergelabs.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--teal-primary)] hover:underline font-medium"
                  >
                    MergeLabs.io
                  </a>
                  {" "}and let me know.
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