import React, { useContext, useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { authContext } from "@/components/use-context";
import { useRouter } from "next/router";
import Link from "next/link";
import { GoEye, GoEyeClosed } from "react-icons/go";
import api from "@/utils/api"; // ✅ Import the configured axios instance

const Login = () => {
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  const { loginUser, user } = useContext(authContext);
  const router = useRouter();

  const passwordVisibilityToggle = () => {
    setPassword(password === "password" ? "text" : "password");
  };

  const initialValues = {
    email: "",
    password: "",
  };

  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .email("This is not a valid email")
      .required("Email is required!"),
    password: Yup.string().required("Password is required!"),
  });

  const handleLogin = async (formValue, helpers) => {
    try {
      setLoading(true);

      // 1. Make the login request using the api instance
      const response = await api.post('/users/login/', {
        email: formValue.email,
        password: formValue.password,
      });
      console.log("LOGIN_RESPONSE ", response.data);

      // 2. Extract and store the access token
      const { access } = response.data;
      if (access) {
        localStorage.setItem('access_token', access);
      }

      // 3. Update the auth context (this may rely on the token we just set)
      //    If loginUser makes another API call, it will now include the token.
      await loginUser(formValue.email, formValue.password);

      helpers.resetForm();
      setLoading(false);

      // 4. Redirect based on user role (context should now have the user)
      if (user?.role === 'patient') {
        router.push("/");
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setLoading(false);
      console.log("LOGIN_ERROR ", err);
    }
  };

  // Optional: redirect when user is set from context (as a fallback)
  useEffect(() => {
    if (user) {
      if (user.role === 'patient') {
        router.push("/");
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  return (
    <section className="flex items-center gap-8 h-screen overflow-hidden">
      <div className="md:w-1/2 w-full space-y-8 px-4">
        <div className="w-7/12 mx-auto">
          <h1 className="text-2xl font-bold text-center">Login</h1>
        </div>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleLogin}
        >
          <Form className="md:w-9/12 w-full mx-auto">
            <section className="flex flex-col items-center justify-center space-y-8">
              <div className="w-full">
                <Field
                  className="block border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                  type="email"
                  placeholder="Email"
                  name="email"
                />
                <ErrorMessage
                  name="email"
                  component="div"
                  className="text-warning text-xs"
                />
              </div>
              <div className="w-full">
                <div className="flex justify-between border border-gray rounded-xl items-center pr-2">
                  <Field
                    className="block text-sm py-2 rounded-xl px-4 focus:outline-none w-full"
                    type={password}
                    placeholder="Password"
                    name="password"
                  />
                  {password === "password" ? (
                    <GoEye onClick={passwordVisibilityToggle} className="cursor-pointer" />
                  ) : (
                    <GoEyeClosed onClick={passwordVisibilityToggle} className="cursor-pointer" />
                  )}
                </div>
                <ErrorMessage
                  name="password"
                  component="div"
                  className="text-warning text-xs"
                />
              </div>
              <button
                type="submit"
                className="bg-primary w-full rounded-xl text-sm px-8 py-3 text-white"
                disabled={loading}
              >
                {loading && (
                  <svg
                    aria-hidden="true"
                    role="status"
                    className="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* spinner paths – keep as is */}
                  </svg>
                )}
                Login
              </button>
              <div className="flex items-center gap-4">
                <p>Forgot Password ?</p>
                <span className="text-primary_light">
                  <Link href="/auth/forgot-password">Reset</Link>
                </span>
              </div>
              <div className="flex gap-4">
                <p>Do you have an account ?</p>
                <span className="text-primary_light">
                  <Link href="/auth/register">SignUp</Link>
                </span>
              </div>
            </section>
          </Form>
        </Formik>
      </div>
      <div className="md:block hidden w-1/2">
        <section className="loginPage rounded-3xl flex items-center h-[90vh] p-4">
          <div>
            <div className="space-y-4">
              <h1 className="text-2xl text-white uppercase">Welcome to</h1>
              <h1 className="uppercase text-white text-2xl border-b py-4 border-white">
                EaSyMed HMIS
              </h1>
              <p className="text-sm text-white">
                If you forgot your password, please contact your system
                administrator for a password reset
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};

export default Login;