// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";
import { runLegacyCopyCleanup } from "./lib/legacyCopyCleanup";

runLegacyCopyCleanup();

mount(() => <StartClient />, document.getElementById("app")!);
