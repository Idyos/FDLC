import { Heart } from "lucide-react";
import { motion } from "framer-motion";

// TODO: substitueix per l'enllaç real de donacions (Bizum, PayPal, Stripe, etc.)
const DONATION_URL = "https://buy.stripe.com/14AaEX0Sr2Tl2m33mj3wQ02";

const ORGANIZERS_IMAGE_SRC = "/IMG-20260821-WA0021.jpg";

export default function DonationButton() {
  return (
    <motion.a
      href={DONATION_URL}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="group relative block w-full h-32 sm:h-40 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
    >
      <img
        src={ORGANIZERS_IMAGE_SRC}
        alt="Organitzadors del Circuit de Penyes"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 flex items-center justify-between gap-4 h-full px-4 sm:px-6 text-white">
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 fill-current shrink-0" />
            <p className="text-sm sm:text-lg font-bold">Col•labora amb el Circuit de Penyes</p>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-white/90 line-clamp-2">
            Organitzar el circuit té un cost. Si t'agrada el que fem, considera fer-nos
            una donació totalment voluntària.
          </p>
        </div>

        <span className="shrink-0 inline-flex items-center rounded-full bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-black shadow transition-colors group-hover:bg-white/90">
          Fes una donació
        </span>
      </div>
    </motion.a>
  );
}
