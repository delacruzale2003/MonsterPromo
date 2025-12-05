import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import imageCompression from "browser-image-compression";
import { UPLOAD_URL, API_URL, CAMPAIGN_ID } from "../constants/RegistrationConstants";
import type { RouteParams } from "../constants/RegistrationConstants";

// Definición de la interfaz del hook para TypeScript
interface RegistrationHook {
    loading: boolean;
    compressing: boolean;
    preview: string | null;
    compressedFile: File | null;
    message: string;
    name: string;
    dni: string;
    phoneNumber: string;
    voucherNumber: string; 
    // storeId: string | undefined; <--- Eliminado del contrato si este hook es solo para registro
    storeId: string | undefined; // Lo mantenemos solo porque useParams lo devuelve, pero lo ignoramos
    setName: (value: string) => void;
    setDni: (value: string) => void;
    setPhoneNumber: (value: string) => void;
    setVoucherNumber: (value: string) => void; 
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}


export const useRegistration = (): RegistrationHook => {
    // === ESTADOS ===
    const [loading, setLoading] = useState(false);
    const [compressing, setCompressing] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [compressedFile, setCompressedFile] = useState<File | null>(null);
    const [message, setMessage] = useState("");

    // Estados para los inputs
    const [name, setName] = useState('');
    const [dni, setDni] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [voucherNumber, setVoucherNumber] = useState(''); 

    // === HOOKS DE ROUTER ===
    const { storeId } = useParams<RouteParams>();
    const navigate = useNavigate();

    // === MANEJADORES DE ARCHIVOS (Compresión) ===
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setCompressedFile(null);
            setPreview(null);
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setPreview(previewUrl);

        setCompressing(true);
        setMessage("");
        try {
            const compressed = await imageCompression(file, {
                maxSizeMB: 1, // 1MB
                maxWidthOrHeight: 800, // 800px max
                useWebWorker: true,
            });
            setCompressedFile(compressed);
        } catch (err) {
            console.error("Error al comprimir:", err);
            setMessage("❌ Error al comprimir la imagen.");
        } finally {
            setCompressing(false);
        }
    };

    // === ENVÍO DE FORMULARIO (Validación y Subida) ===
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage("");

        // ** VALIDACIONES DE LONGITUD Y OBLIGATORIEDAD **
        const trimmedName = name.trim();
        const trimmedPhone = phoneNumber.trim();
        const trimmedDni = dni.trim();
        const trimmedVoucher = voucherNumber.trim(); 

        let validationError = '';

        // 1. Validar Nombre (Obligatorio, máx 45)
        if (trimmedName.length > 45 || trimmedName.length === 0) {
            validationError = "❌ Nombre inválido (máx. 45 caracteres).";
        } 
        // 2. Validar Teléfono (Obligatorio, 9 dígitos)
        else if (trimmedPhone.length !== 9 || !/^\d+$/.test(trimmedPhone)) {
            validationError = "❌ Teléfono debe tener exactamente 9 dígitos numéricos.";
        }
        // 3. Validar DNI (Obligatorio, 8-11 dígitos)
        else if (trimmedDni.length < 8 || trimmedDni.length > 11 || !/^\d+$/.test(trimmedDni)) {
            validationError = "❌ DNI inválido (debe tener entre 8 y 11 dígitos numéricos).";
        } 
        // 4. Validar Comprobante (Obligatorio, 6-20 caracteres)
        else if (trimmedVoucher.length < 6 || trimmedVoucher.length > 20) {
            validationError = "❌ Comprobante inválido (debe tener entre 6 y 20 caracteres).";
        } 
        // 5. Validar Foto (Obligatorio)
        else if (!compressedFile) {
            validationError = "❌ La foto del comprobante es obligatoria.";
        }

        if (validationError) {
            setMessage(validationError);
            return;
        }

        // 💡 ENDPOINT FIJO: Solo registro sin premios.
        const endpoint = `/api/v1/only-register`;
        
        setLoading(true);

        let photoUrl = "";

        // 1. SUBIR LA FOTO COMPRIMIDA (Servicio PHP)
        try {
            const uploadData = new FormData();
            uploadData.append("photo", compressedFile as File);

            const uploadRes = await fetch(UPLOAD_URL, {
                method: "POST",
                body: uploadData,
            });

            if (!uploadRes.ok) {
                const errorText = await uploadRes.text();
                throw new Error(`Error en la subida : ${uploadRes.status} - ${errorText}`);
            }

            const uploadJson = await uploadRes.json();
            photoUrl = uploadJson.url;
        } catch (err) {
            console.error("Error al subir la foto:", err);
            setMessage(`❌ Fallo crítico al subir la foto. ${err instanceof Error ? err.message : 'Error desconocido.'}`);
            setLoading(false);
            return;
        }

        // 2. CONSTRUIR PAYLOAD FIJO (SIN storeId/prizeId)
        const payload = {
            name: trimmedName,
            phoneNumber: trimmedPhone,
            dni: trimmedDni,
            campaign: CAMPAIGN_ID,
            photoUrl,
            voucherNumber: trimmedVoucher, 
        };
        
        // 3. ENVIAR PAYLOAD FINAL AL BACKEND
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const resJson = await res.json();

            if (res.ok) {
                // 💡 NAVEGACIÓN FIJA: Éxito de registro simple
                navigate('/exit');
               
            } else {
                setMessage(`❌ ${resJson.message || "Error en el registro"}`);
            }
        } catch (err) {
            setMessage("❌ No se pudo conectar al servidor de Premios (Render)");
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        compressing,
        preview,
        compressedFile,
        message,
        name,
        dni,
        phoneNumber,
        voucherNumber, 
        storeId,
        setName,
        setDni,
        setPhoneNumber,
        setVoucherNumber, 
        handleFileChange,
        handleSubmit,
    };
};