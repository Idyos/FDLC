import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { browserLocalPersistence, browserSessionPersistence, getAuth, setPersistence, signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().min(1, "Camp obligatori").email("Format del correu electrònic incorrecte"),
  password: z.string().min(1, "Camp obligatori").min(6, "La contrasenya ha de tenir almenys 6 caràcters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginFormProps = {
    auth: ReturnType<typeof getAuth>;
    onClick: () => void;
  };

export default function LoginForm({ auth, onClick }: LoginFormProps) {
    const [rememberMe, setRememberMe] = useState(false);
    const [loggingIn, setLoggingIn] = useState(false);
    document.title = "Iniciar sessió";

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
        reValidateMode: "onSubmit",
    });

    const onTryLogin = (data: LoginFormValues) => {
      console.log("Intentant iniciar sessió amb:", data);
      setLoggingIn(true);
        setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
          .then(() => {
            return signInWithEmailAndPassword(auth, data.email, data.password);
          })
          .then((userCredential) => {
            console.log("Usuari logat:", userCredential.user);  
            onClick();
            setLoggingIn(false);
          })
          .catch((error) => {
            console.error("Error:", error.code, error.message);
            switch (error.code) {
              case "auth/invalid-credential":
                toast.error("Credencials no vàlides");
                break;
              case "auth/user-disabled":
                toast.error("Usuari deshabilitat");
                break;
              case "auth/too-many-requests":
                toast.error("Masses peticions. Torna-ho a intentar més tard.");
                break;
              case "auth/user-not-found":
                toast.error("Usuari no trobat");
                break;
              case "auth/wrong-password":
                toast.error("Contrasenya incorrecta");
                break;
              default:
                toast.error("Error al iniciar sessió: " + error.message);
            }
            setLoggingIn(false);
          });
      };

      useEffect(() => {

      }, [loggingIn]);


    return(
      <div className="flex flex-col items-center w-full max-w-md">
      <img src="/459145412_354680424277091_5558863795687889296_n.png" alt="Logo" className="h-28 w-28 rounded-full object-cover shadow-xl mb-4 z-10" />
      <div className="w-full border-1 rounded-2xl shadow-lg p-6 bg-card">
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onTryLogin)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="admin@example.com" {...field} onChange={(e) => { field.onChange(e); form.clearErrors("email"); }} />
                </FormControl>
                <FormMessage className="text-left"/> {/* Aquí se muestran errores */}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contrasenya</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} onChange={(e) => { field.onChange(e); form.clearErrors("password"); }} />
                </FormControl>
                <FormMessage className="text-left"/> {/* Aquí se muestran errores */}
              </FormItem>
            )}
          />

          <div className="flex items-center gap-3">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(result) => result === "indeterminate" ? setRememberMe(false) : setRememberMe(result)}
            />
            <Label htmlFor="remember-me">Recordar sessió</Label>
          </div>
          <Button type="submit" className="w-full" disabled={loggingIn}>
            {loggingIn ? <LoaderCircle className="animate-spin mr-2" /> : "Iniciar sessió"}
          </Button>
          {/* <Button variant={"outline"} className="w-full" onClick={() => setIsLogin(false)}>Crear compte</Button> */}
        </form>
      </Form>
    </div>
    </div>
    );
}