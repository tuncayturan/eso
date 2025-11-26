"use client";

import { useEffect } from "react";
import firebase from "@/lib/firebase";

export default function ClientInit() {
  useEffect(() => {
    (window as any).firebase = firebase;
  }, []);

  return null;
}
