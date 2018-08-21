import swal from 'sweetalert2';

export const modal = {
    error: (title, content = '') => {
        swal(
            title,
            content,
            'error'
        );
    },
    warning: (title, content = '') => {
        swal(
            title,
            content,
            'warning'
        );
    },
    confirm: (title = '提示', content = '') => {
        return swal({
            title: title,
            text: content,
            type: 'warning',
            showCancelButton: true,
            confirmButtonText: '确定',
            cancelButtonText: '取消',
        });
    },
    delete: (title = '提示', content = '') => {
        return swal({
            title: title,
            text: content,
            type: 'warning',
            showCancelButton: true,
            confirmButtonText: '确定',
            cancelButtonText: '取消'
        });
    }
};