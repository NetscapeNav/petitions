import Swal from 'sweetalert2';
import './custom-swal.css';

export interface MyAlertInterface {
    success: (title: string, text?: string) => Promise<any>;
    error: (title: string, text?: string) => Promise<any>;
    warning: (title: string, text?: string) => Promise<any>;
    info: (title: string, text?: string) => Promise<any>;
    confirm: (title: string, text?: string, confirmText?: string) => Promise<boolean>;
    input: (title: string, placeholder?: string) => Promise<string | null>;
    textarea: (title: string, placeholder?: string) => Promise<string | null>;
}

export const myAlert: MyAlertInterface = {
    success: (title: string, text: string = '') => {
        return Swal.fire({
            title,
            text,
            icon: 'success',
            confirmButtonText: 'OK'
        });
    },

    error: (title: string, text: string = '') => {
        return Swal.fire({
            title,
            text,
            icon: 'error',
            confirmButtonText: 'OK'
        });
    },

    warning: (title: string, text: string = '') => {
        return Swal.fire({
            title,
            text,
            icon: 'warning',
            confirmButtonText: 'OK'
        });
    },

    info: (title: string, text: string = '') => {
        return Swal.fire({
            title,
            text,
            icon: 'info',
            confirmButtonText: 'OK'
        });
    },

    confirm: async (title: string, text: string = '', confirmText: string = 'Да'): Promise<boolean> => {
        const result = await Swal.fire({
            title,
            text,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: 'Отмена',
            reverseButtons: true
        });
        return result.isConfirmed;
    },

    input: async (title: string, placeholder: string = ''): Promise<string | null> => {
        const result = await Swal.fire({
            title,
            input: 'text',
            inputPlaceholder: placeholder,
            showCancelButton: true,
            confirmButtonText: 'OK',
            cancelButtonText: 'Отмена',
            reverseButtons: true,
            inputValidator: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Поле не может быть пустым!';
                }
                return null;
            }
        });
        
        return result.isConfirmed ? result.value : null;
    },

    textarea: async (title: string, placeholder: string = ''): Promise<string | null> => {
        const result = await Swal.fire({
            title,
            input: 'textarea',
            inputPlaceholder: placeholder,
            showCancelButton: true,
            confirmButtonText: 'Отправить',
            cancelButtonText: 'Отмена',
            reverseButtons: true,
            inputValidator: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Сообщение не может быть пустым!';
                }
                return null;
            }
        });
        
        return result.isConfirmed ? result.value : null;
    }
};