/* Source: http://stackoverflow.com/questions/12368910/html-display-image-after-selecting-filename 
 - used to render images on screen after uploading to comic strip page */

function readURL1(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();

            reader.onload = function (e) {
                $('#cell1')
                    .attr('src', e.target.result)
                    //.width(273)
                    .height(300);
            };

            reader.readAsDataURL(input.files[0]);
        }
    }

function readURL2(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();

            reader.onload = function (e) {
                $('#cell2')
                    .attr('src', e.target.result)
                    //.width(273)
                    .height(300);
            };

            reader.readAsDataURL(input.files[0]);
        }
    }

function readURL3(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();

            reader.onload = function (e) {
                $('#cell3')
                    .attr('src', e.target.result)
                    //.width(273)
                    .height(300);
            };

            reader.readAsDataURL(input.files[0]);
        }
    }

function readURL4(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();

            reader.onload = function (e) {
                $('#cell4')
                    .attr('src', e.target.result)
                    //.width(273)
                    .height(300);
            };

            reader.readAsDataURL(input.files[0]);
        }
    }

function readURLpp(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();

            reader.onload = function (e) {
                $('#cellpp')
                    .attr('src', e.target.result)
                    .width(120)
                    .height(120);
            };

            reader.readAsDataURL(input.files[0]);
        }
    }
