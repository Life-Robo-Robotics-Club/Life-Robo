import { createContext, useContext } from "react";

/** True once the first-visit intro has finished (or was skipped). Hero entrance waits for it. */
export const IntroContext = createContext(true);
export const useIntroDone = () => useContext(IntroContext);
