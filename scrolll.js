document.addEventListener('DOMContentLoaded', function() {

    document.querySelector('.projects').addEventListener('click', function(event) {
        event.preventDefault();
        document.querySelector('.project-section').scrollIntoView({ behavior: 'smooth' });
    });

    document.querySelector('.experience').addEventListener('click', function(event) {
        event.preventDefault();
        document.querySelector('.experience-section').scrollIntoView({ behavior: 'smooth' });
    });

});
