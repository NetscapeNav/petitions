import Swal from 'sweetalert2';
import './custom-swal.css';

export const myAlert = {
    success: (title, text = '') => {
        return Swal.fire({
            title,
            text,
            icon: 'success',
            confirmButtonText: 'OK'
        });
    },

    error: (title, text = '') => {
        return Swal.fire({
            title,
            text, 
            icon: 'error',
            confirmButtonText: 'OK'
        });
    },

    warning: (title, text = '') => {
        return Swal.fire({
            title,
            text,
            icon: 'warning', 
            confirmButtonText: 'OK'
        });
    },

    info: (title, text = '') => {
        return Swal.fire({
            title,
            text,
            icon: 'info',
            confirmButtonText: 'OK'
        });
    },

    confirm: async (title, text = '', confirmText = 'Да') => {
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

    input: async (title, placeholder = '') => {
        const result = await Swal.fire({
            title,
            input: 'text',
            inputPlaceholder: placeholder,
            showCancelButton: true,
            confirmButtonText: 'OK',
            cancelButtonText: 'Отмена',
            reverseButtons: true,
            inputValidator: (value) => {
                if (!value) {
                    return 'Поле не может быть пустым!';
                }
            }
        });
        
        return result.isConfirmed ? result.value : null;
    },

    textarea: async (title, placeholder = '') => {
        const result = await Swal.fire({
            title,
            input: 'textarea',
            inputPlaceholder: placeholder,
            showCancelButton: true,
            confirmButtonText: 'Отправить',
            cancelButtonText: 'Отмена',
            reverseButtons: true,
            inputValidator: (value) => {
                if (!value || value.trim() === '') {
                    return 'Сообщение не может быть пустым!';
                }
            }
        });
        
        return result.isConfirmed ? result.value : null;
    }
};