import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Mail } from "lucide-react";

export default function CheckEmailPage() {
  return (
    <div 
      className="min-h-screen relative flex items-center justify-center"
      style={{
        backgroundImage: "url('/images/ForgetPasswordBg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 w-full max-w-md mx-4">
        <div className="text-center">
          {/* Mail Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Mail className="w-16 h-16 text-brand mx-auto" />
              <CheckCircle className="w-6 h-6 text-green-500 absolute -top-1 -right-1" />
            </div>
          </div>

          {/* Title and Description */}
          <h1 className="text-3xl font-bold mb-4 text-brand">
            Check Your Email
          </h1>
          <p className="text-brand-light text-sm mb-8">
            We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
          </p>

          {/* Additional Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              <strong>Didn't receive the email?</strong> Check your spam folder or try requesting a new reset link.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Link 
              href="/login" 
              className="block w-full bg-brand text-white py-2 px-4 rounded-md hover:bg-brand/90 transition-colors text-center"
            >
              Back to Login
            </Link>
            <Link 
              href="/forgot-password" 
              className="block w-full text-brand hover:underline text-center"
            >
              Send Another Email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}