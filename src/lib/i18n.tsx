"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useStore, type Language } from "@/lib/store";

const ES: Record<string, string> = {
  "Today": "Hoy",
  "Log": "Registro",
  "Menu": "Menú",
  "Stats": "Estadísticas",
  "Squad": "Squad",
  "Workouts": "Ejercicios",
  "Notifications": "Notificaciones",
  "Get Coach reminders": "Recibe recordatorios del Coach",
  "Receive reminders based on your Coach priorities.": "Recibe recordatorios según tus prioridades del Coach.",
  "Enable notifications": "Activar notificaciones",
  "Enabling…": "Activando…",
  "Enable notifications in your browser settings.": "Activa las notificaciones en los ajustes de tu navegador.",
  "Coach notifications are on": "Notificaciones del Coach activas",
  "Change time": "Cambiar hora",
  "Today reminders": "Recordatorios de hoy",
  "clear": "limpio",
  "You are caught up for now.": "Vas al día por ahora.",
  "Log your first meal": "Registra tu primera comida",
  "Your calorie and macro graphs need today's meals.": "Tus gráficas de calorías y macros necesitan las comidas de hoy.",
  "Hydration check": "Chequeo de hidratación",
  "Add water from Today.": "Agrega agua desde Hoy.",
  "Add sleep": "Agrega sueño",
  "Log last night's sleep so Stats can build your trend.": "Registra tu sueño de anoche para que Estadísticas cree tu tendencia.",
  "Open Squad to read the latest chat.": "Abre Squad para leer el chat mas reciente.",
  "Open Squad to read it.": "Abre Squad para leerlo.",
  "Open profile menu": "Abrir menú de perfil",
  "My profile": "Mi perfil",
  "Log out": "Cerrar sesión",
  "Language": "Idioma",
  "English": "Inglés",
  "Spanish": "Español",

  "Log in": "Iniciar sesion",
  "Wilis chaparro me la pelas.": "Wilis chaparro me la pelas.",
  "Email": "Correo",
  "Password": "Contraseña",
  "Show password": "Mostrar contraseña",
  "Hide password": "Ocultar contraseña",
  "Welcome back": "Bienvenido de vuelta",
  "Authentication failed.": "No se pudo autenticar.",
  "Sign up failed.": "No se pudo registrar.",
  "Use a valid email address.": "Usa un correo válido.",
  "Burning in...": "Entrando...",
  "Burning in…": "Entrando...",
  "No account?": "No tienes cuenta?",
  "Create one": "Crear una",
  "Create account": "Crear cuenta",
  "Use a real email and a strong password.": "Usa un correo real y una contraseña fuerte.",
  "Verify email": "Verificar correo",
  "Verification code": "Código de verificación",
  "Verification code sent": "Código de verificación enviado",
  "Account created": "Cuenta creada",
  "Email verified": "Correo verificado",
  "Verification failed.": "La verificación falló.",
  "Verify and continue": "Verificar y continuar",
  "Verifying...": "Verificando...",
  "Verifying…": "Verificando...",
  "Use a different email": "Usar otro correo",
  "Name": "Nombre",
  "Tell us your name": "Dinos tu nombre",
  "Get started": "Empezar",
  "Lighting the spark...": "Encendiendo la chispa...",
  "Lighting the spark…": "Encendiendo la chispa...",
  "Already in?": "Ya tienes cuenta?",
  "Password must be at least 8 characters and include 1 uppercase letter and 1 number.": "La contraseña debe tener al menos 8 caracteres, 1 mayúscula y 1 número.",
  "Enter the 6-digit verification code.": "Ingresa el código de verificación de 6 dígitos.",
  "Required": "Requerido",

  "Start": "Inicio",
  "Set up": "Configurar",
  "We use these to power your BMR, TDEE, and deficit math.": "Usamos esto para calcular tu BMR, TDEE y déficit.",
  "Sex (biological)": "Sexo biológico",
  "male": "hombre",
  "female": "mujer",
  "Birthdate": "Fecha de nacimiento",
  "Height (cm)": "Altura (cm)",
  "Weight (kg)": "Peso (kg)",
  "Continue": "Continuar",
  "Pace": "Ritmo",
  "How active are you day to day?": "¿Qué tan activo eres día a día?",
  "Back": "Atrás",
  "Your targets": "Tus metas",
  "Skip for now": "Saltar por ahora",
  "Body goal": "Meta corporal",
  "lose": "bajar",
  "maintain": "mantener",
  "gain": "subir",
  "We keep progress history. Squad only sees progress, not your weight.": "Guardamos historial de progreso. El squad solo ve progreso, no tu peso.",
  "Calorie goal (kcal/day)": "Meta de calorías (kcal/día)",
  "Macros below auto-update when you change calories.": "Los macros de abajo se actualizan cuando cambias calorías.",
  "AM snack": "Snack AM",
  "PM snack": "Snack PM",
  "Skip meal times": "Saltar horarios",
  "Optional. These decide whether the dashboard shows breakfast, snack, lunch, or dinner options. If you don't know yet, skip this and set it later in Profile.": "Opcional. Esto decide si el inicio muestra desayuno, snack, comida o cena. Si aún no sabes, sáltalo y configúralo después en Perfil.",
  "Finish": "Finalizar",
  "Profile saved. Let's burn.": "Perfil guardado. A quemar.",
  "Could not save profile": "No se pudo guardar el perfil",
  "Setup error": "Error de configuración",
  "Authentication error": "Error de autenticación",
  "Something went wrong": "Algo salió mal",

  "Daily balance": "Balance diario",
  "Today priorities": "Prioridades de hoy",
  "Your daily focus": "Tu enfoque diario",
  "Calories": "Calorías",
  "Goal": "Meta",
  "Protein": "Proteína",
  "Carbs": "Carbohidratos",
  "Fat": "Grasa",
  "Breakfast": "Desayuno",
  "Lunch": "Comida",
  "Dinner": "Cena",
  "Snack": "Snack",
  "Your Menu": "Tu menú",
  "No meals for this time yet. Add meals to Your Menu.": "Aún no hay comidas para este horario. Agrega comidas a Tu menú.",
  "Log this meal": "Registrar esta comida",
  "Logged meals": "Comidas registradas",
  "Add meal": "Agregar comida",
  "No meals logged yet": "Aún no hay comidas registradas",
  "Tap a meal option above or use Log.": "Toca una opcion de comida arriba o usa Registro.",
  "Meal removed": "Comida eliminada",
  "Saved locally": "Guardado localmente",
  "Meal saved locally": "Comida guardada localmente",
  "Meal removed locally": "Comida eliminada localmente",
  "Squad pulse": "Pulso del squad",
  "Open squad": "Abrir squad",
  "No squad yet": "Aún no tienes squad",
  "Join a squad to see friends here.": "Unete a un squad para ver a tus amigos aqui.",
  "Next workout": "Siguiente ejercicio",
  "Star exercises": "Marcar ejercicios",
  "No favorite workouts yet": "Aún no hay ejercicios favoritos",
  "Star exercises in Workouts and they will show up here.": "Marca ejercicios en Ejercicios y apareceran aqui.",
  "Add": "Agregar",
  "Water": "Agua",
  "Sleep": "Sueno",
  "No-fap streak logged": "Racha no-fap registrada",
  "No fap challenge": "Reto No fap",
  "Did you complete the No fap challenge today?": "¿Completaste hoy el reto No fap?",
  "Challenge day registered.": "Dia del reto registrado.",
  "Log no-fap streak day": "Registrar día de racha no-fap",
  "Did you really not masturbate today?": "De verdad no te masturbaste hoy?",
  "Be honest. This only counts if you made it through today.": "Sé honesto. Esto solo cuenta si aguantaste todo el día.",
  "Not today": "Hoy no",
  "Yes, log it": "Si, registrarlo",

  "Track": "Registro",
  "Quick log": "Registro rápido",
  "AI Macros": "Macros IA",
  "Search Food": "Buscar comida",
  "Describe your food first": "Describe tu comida primero",
  "AI failed. Try again.": "La IA fallo. Intenta otra vez.",
  "Describe your meal in plain words": "Describe tu comida con palabras simples",
  "Analyze macros": "Analizar macros",
  "Analyzing...": "Analizando...",
  "Analyzing…": "Analizando...",
  "Confirm before saving": "Confirma antes de guardar",
  "Gemini estimate": "Estimacion de Gemini",
  "Backup estimate · Gemini was unavailable": "Estimacion de respaldo · Gemini no estuvo disponible",
  "Discard": "Descartar",
  "Confirm & log": "Confirmar y registrar",

  "Fuel plan": "Plan de comida",
  "Save and reuse your go-to meals": "Guarda y reutiliza tus comidas favoritas",
  "Menu controls": "Controles del menú",
  "Hide default menu": "Ocultar menú predeterminado",
  "Use default menu": "Usar menú predeterminado",
  "Default menu restored": "Menú predeterminado restaurado",
  "Add to Your Menu": "Agregar a Tu menú",
  "Import Your Menu": "Importar Tu menú",
  "Upload a PDF, clear photo, or TXT menu. Gemini will extract meal options and macros for review before saving.": "Sube un PDF, foto clara o TXT. Gemini extraerá comidas y macros para revisarlas antes de guardar.",
  "Menu file": "Archivo del menú",
  "Choose menu file": "Elegir archivo del menú",
  "No file chosen": "Ningún archivo elegido",
  "Extract meals": "Extraer comidas",
  "Review imported meals": "Revisar comidas importadas",
  "Save all": "Guardar todo",
  "Meal added to Your Menu": "Comida agregada a Tu menú",
  "Imported meals saved to Your Menu": "Comidas importadas guardadas en Tu menú",
  "Upload a menu or paste the menu text first": "Sube un menú o pega primero el texto del menú",
  "Menu import failed": "La importación del menú falló",
  "No meals were found in that menu.": "No se encontraron comidas en ese menú.",
  "Add a meal name and recipe details": "Agrega nombre de comida y detalles de receta",
  "Macros must be valid positive numbers": "Los macros deben ser números positivos válidos",
  "Add a meal": "Agregar comida",
  "Clear review": "Limpiar revisión",
  "Paste meals, ingredients, or macros here...": "Pega comidas, ingredientes o macros aquí...",

  "Profile": "Perfil",
  "Tap the camera to change your picture": "Toca la camara para cambiar tu foto",
  "Day streak": "Racha diaria",
  "Best streak": "Mejor racha",
  "Your stats": "Tus datos",
  "Sex": "Sexo",
  "Height": "Altura",
  "Weight": "Peso",
  "Activity": "Actividad",
  "Daily targets": "Metas diarias",
  "Calorie goal": "Meta de calorías",
  "Long-term goal": "Meta a largo plazo",
  "Lose": "Bajar",
  "Maintain": "Mantener",
  "Gain": "Subir",
  "Target weight (kg)": "Peso objetivo (kg)",
  "Target date": "Fecha objetivo",
  "Save goal": "Guardar meta",
  "Meal times": "Horarios de comida",
  "Save meal times": "Guardar horarios",
  "Stats & daily targets": "Datos y metas diarias",
  "Save stats & targets": "Guardar datos y metas",
  "Cancel": "Cancelar",
  "Edit": "Editar",
  "Saving...": "Guardando...",
  "Saving…": "Guardando...",
  "Profile picture updated": "Foto de perfil actualizada",
  "Profile picture removed": "Foto de perfil eliminada",
  "Stats and targets saved": "Datos y metas guardados",
  "Notifications blocked": "Notificaciones bloqueadas",
  "This browser doesn't support notifications": "Este navegador no soporta notificaciones",
  "Could not save stats": "No se pudieron guardar los datos",
  "Meal times saved": "Horarios guardados",
  "Could not save meal times": "No se pudieron guardar horarios",
  "Goal saved": "Meta guardada",
  "Could not save goal": "No se pudo guardar la meta",
  "All data reset": "Todos los datos se reiniciaron",
  "Choose an image file": "Elige un archivo de imagen",
  "Profile picture must be under 5 MB": "La foto de perfil debe pesar menos de 5 MB",
  "Could not update picture": "No se pudo actualizar la foto",
  "Could not remove picture": "No se pudo eliminar la foto",
  "Saving picture...": "Guardando foto...",
  "Daily reminders": "Recordatorios diarios",
  "On": "Activo",
  "Off": "Inactivo",
  "Reminders on": "Recordatorios activos",
  "You'll get a daily nudge to log.": "Recibirás un empujón diario para registrar.",
  "Reminders off": "Recordatorios desactivados",
  "Enable in browser settings to get reminders.": "Activalas en ajustes del navegador para recibir recordatorios.",
  "Disable reminders": "Desactivar recordatorios",
  "Enable reminders": "Activar recordatorios",
  "Mode": "Modo",
  "Target": "Objetivo",
  "Date": "Fecha",
  "Later": "Despues",
  "Carbs / Fat": "Carbos / Grasa",
  "Squad sees goal type and progress, never your height or weight.": "El squad ve tipo de meta y progreso, nunca tu altura ni peso.",

  "Deficit, check-ins, water, and sleep history": "Historial de déficit, check-ins, agua y sueño",
  "Week view uses ISO weeks: Monday to Sunday.": "La vista semanal usa semanas ISO: lunes a domingo.",
  "Deficit / calories history": "Historial de déficit / calorías",
  "Weight trend + goal": "Tendencia de peso + meta",
  "Progress photos": "Fotos de progreso",
  "Water + sleep": "Agua + sueño",
  "Week": "Semana",
  "Month": "Mes",
  "Year": "Ano",
  "All time": "Todo",
  "Calories eaten (bar)": "Calorías comidas (barra)",
  "Workout burn (bar)": "Calorías quemadas (barra)",
  "Real deficit (line)": "Déficit real (línea)",
  "Calorie goal (dotted)": "Meta de calorías (punteada)",
  "Log a check-in to see your trend": "Registra un check-in para ver tu tendencia",
  "Progress": "Progreso",
  "This pace": "Este ritmo",
  "Remaining": "Restante",
  "Water goal": "Meta de agua",
  "Sleep goal": "Meta de sueño",
  "Water (bar)": "Agua (barra)",
  "Sleep (line)": "Sueno (linea)",
  "Goal lines": "Lineas de meta",
  "Loading chart...": "Cargando gráfica...",
  "Add weekly check-ins to compare actual progress against target pace.": "Agrega check-ins semanales para comparar tu progreso real contra el ritmo objetivo.",
  "You are on pace for this week.": "Vas al ritmo correcto esta semana.",
  "You are drifting from maintenance; tighten this week.": "Te estas alejando del mantenimiento; ajusta esta semana.",
  "Stay in a sustainable deficit and watch the trend.": "Mantente en un déficit sostenible y observa la tendencia.",
  "Fuel the surplus and track steady mass gain.": "Alimenta el superávit y mide una subida constante.",
  "Keep the trend stable and protect consistency.": "Mantén estable la tendencia y protege la constancia.",
  "You are hitting hydration well.": "Vas muy bien con la hidratación.",
  "Sleep is on target.": "El sueño está en meta.",

  "Community": "Comunidad",
  "Create a crew or join one with a code. Shared stats stay public; body data stays private.": "Crea un grupo o únete con un código. Las stats compartidas son públicas; los datos corporales son privados.",
  "Start the beef": "Empieza el beef",
  "Create a squad and share the invite code with up to 5 friends.": "Crea un squad y comparte el código con hasta 5 amigos.",
  "Squad name": "Nombre del squad",
  "Create squad": "Crear squad",
  "or join one": "o únete a uno",
  "Squad code": "Código del squad",
  "Join squad": "Unirse al squad",
  "Rename squad": "Renombrar squad",
  "Save": "Guardar",
  "Leave": "Salir",
  "Leave squad?": "Salir del squad?",
  "You will stop syncing with this squad. You can join again later with the invite code.": "Dejarás de sincronizar con este squad. Puedes volver después con el código.",
  "Stay": "Quedarme",
  "No-fap leaderboard": "Tabla no-fap",
  "No fap challenge leaderboard": "Tabla del reto No fap",
  "No teammates to show yet. Share the invite code and bring the beef.": "Aún no hay compañeros. Comparte el código y trae el beef.",
  "Squad talk": "Chat del squad",
  "No messages yet. Be brave. Start the beef.": "Aún no hay mensajes. Sé valiente. Empieza el beef.",
  "Talk your trash...": "Tira tu veneno...",
  "Talk your trash…": "Tira tu veneno...",
  "Invite code": "Código de invitación",
  "Copy": "Copiar",
  "Code copied": "Código copiado",
  "Online now": "En línea",
  "Fitness streak": "Racha fitness",
  "No-fap": "No-fap",
  "Fit streak": "Racha fit",
  "Burned": "Quemado",
  "Meals": "Comidas",
  "goal": "meta",
  "workout": "ejercicio",
  "meals": "comidas",
  "progress": "progreso",
  "done": "hecho",
  "pending": "pendiente",
  "target hit": "meta cumplida",
  "not yet": "aún no",
  "Exercise": "Ejercicio",
  "Name your squad": "Ponle nombre a tu squad",
  "Squad created": "Squad creado",
  "Enter a squad code": "Ingresa un código de squad",
  "Joined squad": "Te uniste al squad",
  "Left squad": "Saliste del squad",
  "Squad name updated": "Nombre del squad actualizado",

  "Exercises": "Ejercicios",
  "Favorites": "Favoritos",
  "Gym": "Gimnasio",
  "Core": "Core",
  "Calisthenics": "Calistenia",
  "Cardio": "Cardio",
  "Log workout": "Registrar ejercicio",
  "Training": "Entrenamiento",
  "Log training and remove mistaken entries.": "Registra entrenamiento y elimina entradas por error.",
  "Recent workouts": "Ejercicios recientes",
  "No workouts logged yet.": "Aún no hay ejercicios registrados.",
  "Workout removed": "Ejercicio eliminado",
  "Workout saved locally": "Ejercicio guardado localmente",
  "Workout removed locally": "Ejercicio eliminado localmente",
  "Pick an exercise": "Elige un ejercicio",
  "Enter duration": "Ingresa la duración",
  "Describe your workout": "Describe tu entrenamiento",
  "AI match failed": "La IA no pudo encontrar coincidencia",
  "Search exercises…": "Buscar ejercicios…",
  "Estimated burn": "Quema estimada",
  "Delete": "Eliminar",

  "Recipes": "Recetas",
  "Kitchen": "Cocina",
  "Save recipe": "Guardar receta",
  "Recipe saved": "Receta guardada",
  "Recipe deleted": "Receta eliminada",
  "New recipe": "Nueva receta",
  "Name your recipe": "Ponle nombre a tu receta",
  "Servings": "Porciones",
  "Ingredients": "Ingredientes",
  "Ingredient": "Ingrediente",
  "Remove ingredient": "Quitar ingrediente",
  "No recipes yet. Save your favorite meal formulas to log them faster.": "Aún no hay recetas. Guarda tus fórmulas favoritas para registrarlas más rápido.",
  "Weekly check-in": "Check-in semanal",
  "Save check-in": "Guardar check-in",
  "This week": "Esta semana",
  "Track your progress. Measurements are optional.": "Registra tu progreso. Las medidas son opcionales.",
  "Waist (cm)": "Cintura (cm)",
  "Chest (cm)": "Pecho (cm)",
  "Hip (cm)": "Cadera (cm)",
  "Arm (cm)": "Brazo (cm)",
  "Progress photo (optional)": "Foto de progreso (opcional)",
  "Photo selected": "Foto seleccionada",
  "Tap to upload": "Toca para subir",
  "Photo ready": "Foto lista",
  "Compressed and ready for cloud sync.": "Comprimida y lista para sincronizar en la nube.",
  "Could not process photo": "No se pudo procesar la foto",
  "Enter your weight": "Ingresa tu peso",
  "Cloud photo upload skipped": "Se omitio la subida de foto a la nube",
  "Saved locally for now.": "Guardado localmente por ahora.",
  "Check-in saved": "Check-in guardado",
  "Could not save check-in": "No se pudo guardar el check-in",
  "Cloudinary is not configured yet.": "Cloudinary aun no esta configurado.",
};

const REGEX_ES: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^Hi, (.+)$/i, (m) => `Hola, ${m[1]}`],
  [/^(.+) options$/i, (m) => `${translateText(m[1], "es")} opciones`],
  [/^Based on your (.+) meal time$/i, (m) => `Basado en tu horario de comida de ${m[1]}`],
  [/^(\d+) days · highest streak (\d+) days$/i, (m) => `${m[1]} ${m[1] === "1" ? "día" : "días"} · racha máxima ${m[2]} ${m[2] === "1" ? "día" : "días"}`],
  [/^(\d+) day · highest streak (\d+) days$/i, (m) => `${m[1]} día · racha máxima ${m[2]} ${m[2] === "1" ? "día" : "días"}`],
  [/^(\d+) now \/ (\d+) best$/i, (m) => `${m[1]} actual / ${m[2]} mejor`],
  [/^(.+) sent a message$/i, (m) => `${m[1]} envio un mensaje`],
  [/^(.+) and (.+) sent messages$/i, (m) => `${m[1]} y ${m[2]} enviaron mensajes`],
  [/^Week started (.+)\.$/i, (m) => `Semana iniciada ${m[1]}.`],
  [/^Last seen (.+)$/i, (m) => `Última vez ${m[1]}`],
];

const ATTRIBUTE_NAMES = ["placeholder", "aria-label", "title"] as const;
const textOriginals = new WeakMap<Text, string>();

export function t(language: Language, value: string) {
  return translateText(value, language);
}

export function translateText(value: string, language: Language) {
  if (language === "en") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const exact = ES[trimmed];
  if (exact) return preserveOuterWhitespace(value, matchCase(trimmed, exact));
  for (const [pattern, replacer] of REGEX_ES) {
    const match = trimmed.match(pattern);
    if (match) return preserveOuterWhitespace(value, replacer(match));
  }
  return value;
}

export function mealLabel(language: Language, label: string) {
  return translateText(label, language);
}

function preserveOuterWhitespace(original: string, translated: string) {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function matchCase(original: string, translated: string) {
  if (original.length > 1 && original === original.toUpperCase()) {
    return translated.toUpperCase();
  }
  return translated;
}

function shouldSkipTextNode(node: Text) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(parent.tagName)) return true;
  if (parent.closest("[data-no-translate]")) return true;
  if (parent.isContentEditable) return true;
  return false;
}

function translateElementAttributes(element: Element, language: Language) {
  if (element.closest("[data-no-translate]")) return;
  for (const attr of ATTRIBUTE_NAMES) {
    const value = element.getAttribute(attr);
    if (!value) continue;
    const key = `data-i18n-original-${attr}`;
    const cached = element.getAttribute(key);
    let original = cached ?? value;
    if (!cached) {
      element.setAttribute(key, value);
    } else if (value !== cached && value !== translateText(cached, "es")) {
      original = value;
      element.setAttribute(key, value);
    }
    const translated = translateText(original, language);
    if (element.getAttribute(attr) !== translated) {
      element.setAttribute(attr, translated);
    }
  }
}

function translateRoot(root: ParentNode, language: Language) {
  if (typeof document === "undefined") return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (!shouldSkipTextNode(node)) {
      const current = node.nodeValue ?? "";
      const cached = textOriginals.get(node);
      let original = cached ?? current;
      if (!cached) {
        textOriginals.set(node, original);
      } else if (current !== cached && current !== translateText(cached, "es")) {
        original = current;
        textOriginals.set(node, original);
      }
      node.nodeValue = translateText(original, language);
    }
    node = walker.nextNode() as Text | null;
  }

  if (root instanceof Element) translateElementAttributes(root, language);
  root.querySelectorAll?.("*").forEach((element) =>
    translateElementAttributes(element, language),
  );
}

export function LanguageDomTranslator() {
  const language = useStore((state) => state.language);
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = language;

    const run = () => translateRoot(document.body, language);
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(run, { timeout: 700 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(run, 0);
    return () => window.clearTimeout(timeoutId);
  }, [language, pathname]);

  const label = useMemo(() => (language === "en" ? "English" : "Spanish"), [language]);
  return <span className="hidden" aria-hidden="true" data-language={label} />;
}
