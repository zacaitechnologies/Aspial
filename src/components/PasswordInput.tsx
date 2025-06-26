import React, { useState } from "react";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeClosed } from "lucide-react"

const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props}, ref) => {
        const [showPassword, setShowPassword] = useState(false)

        return (
            <div className="relative">
                <Input
                type={showPassword ? "text" : "password"}
                className={cn("pe-10", className)} 
                ref={ref}
                {...props}
                />
                <button
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide Password" : "Show Password"} 
                className="absolute right-3 top-1/2 -translate-y-1/2 transform text-muted-foreground"
                >
                    {showPassword ? (
                        <EyeClosed className="size-5" />
                    ) : (
                        <Eye className="size-5" />
                    )}
                </button>
            </div>
        )
    }
)

PasswordInput.displayName = "PasswordInput"

export {PasswordInput}