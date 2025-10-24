import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { browserLocalPersistence, browserSessionPersistence, getAuth, setPersistence, signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Format del correu electrònic incorrecte"),
  password: z.string().min(6, "La contrasenya ha de tenir almenys 6 caràcters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginFormProps = {
    auth: ReturnType<typeof getAuth>;
    setIsLogin: React.Dispatch<React.SetStateAction<boolean>>;
    onClick: () => void;
  };

export default function LoginForm({ auth, setIsLogin, onClick }: LoginFormProps) {
    const [rememberMe, setRememberMe] = useState(false);

    document.title = "Iniciar sessió";

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onTryLogin = (data: LoginFormValues) => {
      console.log("Intentant iniciar sessió amb:", data);
        setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
          .then(() => {
            return signInWithEmailAndPassword(auth, data.email, data.password);
          })
          .then((userCredential) => {
            console.log("Usuari creat:", userCredential.user);  
            onClick();
          })
          .catch((error) => {
            console.error("Error:", error.code, error.message);
          });
      };


    return(
        <div className="max-w-sm mx-auto mt-10 border-1 rounded-2xl shadow-lg p-6 bg-white dark:bg-gray-800">
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onTryLogin)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="admin@example.com" {...field} />
                </FormControl>
                <FormMessage /> {/* Aquí se muestran errores */}
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
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage /> {/* Aquí se muestran errores */}
              </FormItem>
            )}
          />

          <div className="flex items-center gap-3">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(result) => result === "indeterminate" ? setRememberMe(false) : setRememberMe(result)}
            />
            <Label htmlFor="terms">Recordar sessió</Label>
          </div>
          <Button type="submit" className="w-full">Iniciar sessió</Button>
          <Button variant={"outline"} className="w-full" onClick={() => setIsLogin(false)}>Crear compte</Button>
        </form>
      </Form>
    </div>
    );
}