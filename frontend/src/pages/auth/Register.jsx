import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: "student",
    year: "",
    major: "",
    agreeToTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (!formData.agreeToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      setLoading(false);
      return;
    }

    const result = await register({
      username: formData.username,
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
      year: formData.year ? parseInt(formData.year) : undefined,
      major: formData.major
    });

    if (result.success) {
      navigate("/", { replace: true });
    } else {
      setError(result.error || "Registration failed");
    }

    setLoading(false);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen selection:bg-primary/20 dark:selection:bg-primary/30 font-display">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 rounded-xl bg-white dark:bg-card-dark border border-slate-200 dark:border-input-border shadow-lg hover:shadow-xl transition-all"
      >
        <span className="material-symbols-outlined text-xl text-gray-600 dark:text-gray-300">
          {isDark ? 'light_mode' : 'dark_mode'}
        </span>
      </button>

      <div className="flex flex-col lg:flex-row min-h-screen w-full">
        {/* Left Side - Illustration */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-indigo-50/50 dark:bg-background-dark items-center justify-center p-12">
          {/* Background Effects */}
          <div className="absolute top-[-5%] left-[-5%] w-96 h-96 bg-primary/10 dark:bg-primary/20 rounded-full blur-[100px] dark:blur-[120px]"></div>
          <div className="absolute bottom-[-5%] right-[-5%] w-[500px] h-[500px] bg-blue-400/10 dark:bg-indigo-600/10 rounded-full blur-[120px] dark:blur-[150px]"></div>

          <div className="relative z-10 w-full max-w-xl">
            {/* Logo */}
            <div className="mb-12 flex items-center gap-4">
              <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/30 dark:shadow-primary/40">
                <span className="material-symbols-outlined text-white text-[32px] block">hub</span>
              </div>
              <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">UniNexus</span>
            </div>

            {/* Illustration Card */}
            <div className={`rounded-[2.5rem] dark:rounded-3xl overflow-hidden bg-white dark:border-white/10 p-4 dark:p-0 shadow-2xl dark:shadow-2xl border border-white dark:border-white/10 ${!isDark ? 'illustration-shadow' : ''}`}>
              <div
                className="aspect-[4/5] w-full bg-center bg-cover rounded-[1.75rem] dark:rounded-none relative"
                style={{
                  backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDPEZOr3V79yQ1nqxk8YyMDL92rNWMuEsRv8UklHRygH3e37e3TKgY0swuqzvOGfaCIFFSXDK42NRFmBj2hXI4ut7sm-SDRDaMikHah7SgyYKAoqIc5I2RsGBWOrXvfakCMP9ayhVBDmhW5Ntsuwkj0FVJOuMcLZYBncGO_IL0pruqE6os1Vd9dU0CIOHl6wM42OEr8WnoxFIK-SkybRkdmWR5M6H8OZDW4-mn9yvg9gm_VoKmNAj1e_Bsr1jFktpe86Zh_1Sn9yZM')"
                }}
              >
                <div className="w-full h-full bg-gradient-to-t from-slate-900/80 dark:from-[#130f24] via-transparent to-transparent flex flex-col justify-end p-10">
                  <h2 className="text-4xl font-bold leading-tight mb-4 text-white">
                    Join the next generation of campus leaders.
                  </h2>
                  <p className="text-slate-200 dark:text-slate-400 text-lg max-w-md">
                    Connect with over 500+ student organizations and 20,000+ active students in your university community.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-24 bg-white dark:bg-background-dark overflow-y-auto">
          <div className="w-full max-w-[440px]">
            {/* Header */}
            <div className="flex flex-col items-center lg:items-start mb-10">
              <div className="bg-primary p-4 dark:p-3 rounded-2xl shadow-xl shadow-primary/20 mb-8 dark:mb-6 inline-flex">
                <span className="material-symbols-outlined text-white text-[48px] dark:text-[40px] block">hub</span>
              </div>
              <div className="text-center lg:text-left">
                <h1 className="text-4xl font-bold tracking-tight mb-3 text-slate-900 dark:text-white">
                  Create Account
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                  Sign up to join your university community and discover campus events.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex">
                  <span className="material-symbols-outlined text-red-400">error</span>
                  <div className="ml-3">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form - will continue in next part */}
            {/* Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">I am a</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center justify-center p-4 rounded-xl border cursor-pointer transition-all ${formData.role === "student"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-slate-200 dark:border-input-border hover:border-slate-300 dark:hover:border-input-border bg-slate-50/50 dark:bg-card-dark"
                    }`}>
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={formData.role === "student"}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className={`material-symbols-outlined w-5 h-5 mr-2 ${formData.role === "student" ? "text-primary" : "text-slate-400"}`}>school</span>
                    <span className={`font-semibold ${formData.role === "student" ? "text-primary" : "text-slate-600 dark:text-slate-300"}`}>Student</span>
                  </label>

                  <label className={`flex items-center justify-center p-4 rounded-xl border cursor-pointer transition-all ${formData.role === "admin"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-slate-200 dark:border-input-border hover:border-slate-300 dark:hover:border-input-border bg-slate-50/50 dark:bg-card-dark"
                    }`}>
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={formData.role === "admin"}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className={`material-symbols-outlined w-5 h-5 mr-2 ${formData.role === "admin" ? "text-primary" : "text-slate-400"}`}>menu_book</span>
                    <span className={`font-semibold ${formData.role === "admin" ? "text-primary" : "text-slate-600 dark:text-slate-300"}`}>Club Admin</span>
                  </label>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">First Name</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">person</span>
                    </div>
                    <input
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="block w-full pl-11 pr-4 py-4 rounded-xl border border-slate-200 dark:border-input-border bg-slate-50/50 dark:bg-card-dark text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-4 dark:focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-card-dark transition-all outline-none"
                      placeholder="John"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">Last Name</label>
                  <input
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="block w-full px-4 py-4 rounded-xl border border-slate-200 dark:border-input-border bg-slate-50/50 dark:bg-card-dark text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-4 dark:focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-card-dark transition-all outline-none"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <input
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-4 rounded-xl border border-slate-200 dark:border-input-border bg-slate-50/50 dark:bg-card-dark text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-4 dark:focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-card-dark transition-all outline-none"
                    placeholder="johndoe"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">University Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-4 rounded-xl border border-slate-200 dark:border-input-border bg-slate-50/50 dark:bg-card-dark text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-4 dark:focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-card-dark transition-all outline-none"
                    placeholder="name@university.edu"
                  />
                </div>
              </div>

              {/* Academic Info (Conditional) */}
              {formData.role === "student" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">Year</label>
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      className="block w-full px-4 py-4 rounded-xl border border-slate-200 dark:border-input-border bg-slate-50/50 dark:bg-card-dark text-slate-900 dark:text-white focus:ring-4 dark:focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-card-dark transition-all outline-none appearance-none"
                    >
                      <option value="">Select Year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                      <option value="5">Graduate</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">Major</label>
                    <input
                      name="major"
                      type="text"
                      value={formData.major}
                      onChange={handleChange}
                      className="block w-full px-4 py-4 rounded-xl border border-slate-200 dark:border-input-border bg-slate-50/50 dark:bg-card-dark text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-4 dark:focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-card-dark transition-all outline-none"
                      placeholder="Computer Science"
                    />
                  </div>
                </div>
              )}

              {/* Passwords */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-4 rounded-xl border border-slate-200 dark:border-input-border bg-slate-50/50 dark:bg-card-dark text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-4 dark:focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-card-dark transition-all outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-4 rounded-xl border border-slate-200 dark:border-input-border bg-slate-50/50 dark:bg-card-dark text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-4 dark:focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-card-dark transition-all outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-center justify-between py-1 dark:py-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      name="agreeToTerms"
                      type="checkbox"
                      checked={formData.agreeToTerms}
                      onChange={handleChange}
                      className="peer appearance-none w-5 h-5 rounded border border-slate-300 dark:border-input-border bg-white dark:bg-card-dark checked:bg-primary checked:border-primary transition-all"
                    />
                    <span className="material-symbols-outlined absolute text-white opacity-0 peer-checked:opacity-100 text-[16px] pointer-events-none">check</span>
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    I agree to the{" "}
                    <Link to="/terms" className="text-primary font-semibold hover:underline underline-offset-4">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-primary font-semibold hover:underline underline-offset-4">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="space-y-4 pt-2 dark:pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-dark dark:hover:bg-primary/90 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/20 dark:shadow-primary/25 active:scale-[0.99] dark:active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating Account..." : "Create UniNexus Account"}
                </button>

                {/* Divider */}
                <div className="relative py-4 dark:py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100 dark:border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-background-dark px-4 text-slate-400 dark:text-slate-500 tracking-widest font-medium dark:font-normal">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Google Sign Up */}
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-3 bg-white dark:bg-card-dark border border-slate-200 dark:border-input-border hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-input-border py-4 rounded-xl transition-all font-semibold dark:font-medium text-slate-700 dark:text-white"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    ></path>
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    ></path>
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    ></path>
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                      fill="#EA4335"
                    ></path>
                  </svg>
                  <span>
                    Sign up with University Google Account
                  </span>
                </button>
              </div>
            </form>

            {/* Sign In Link */}
            <div className="mt-10 text-center lg:text-left">
              <p className="text-slate-500 dark:text-slate-400">
                Already have an account?
                <Link
                  to="/login"
                  className="text-primary font-bold hover:underline underline-offset-4 ml-1"
                >
                  Sign In
                </Link>
              </p>
            </div>

            {/* Footer Links */}
            <div className="mt-16 flex items-center justify-center lg:justify-start gap-6 text-xs text-slate-400 uppercase tracking-widest font-medium dark:font-normal">
              <Link to="/status" className="hover:text-primary transition-colors">
                System Status
              </Link>
              <span>•</span>
              <Link to="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link to="/contact" className="hover:text-primary transition-colors">
                Student Support
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .illustration-shadow {
          box-shadow: 0 20px 50px -12px rgba(108, 71, 255, 0.15);
        }
      `}</style>
    </div>
  );
};

export default Register;
