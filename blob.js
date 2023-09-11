const blob = document.getElementById("blob");

document.body.onpointermove = event => {
    const { clientX, clientY } = event;

    const adjustedX = clientX - (blob.offsetWidth / 2);
    const adjustedY = clientY - (blob.offsetHeight / 2);

    // Ensure the blob doesn't go beyond the left edge
    const minX = 0;
    // Ensure the blob doesn't go beyond the top edge
    const minY = 0;
    // Ensure the blob doesn't go beyond the right edge
    const maxX = window.innerWidth - blob.offsetWidth;
    // Ensure the blob doesn't go beyond the bottom edge
    const maxY = window.innerHeight - blob.offsetHeight;

    // Constrain the blob's position within the viewport
    const finalX = Math.min(Math.max(adjustedX, minX), maxX);
    const finalY = Math.min(Math.max(adjustedY, minY), maxY);

    blob.style.left = `${finalX}px`;
    blob.style.top = `${finalY}px`;
}

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

//

exports.default = series(scssTask, jsTask, browserSyncServe, watchTask);
// Build Gulp Task
exports.build = series(scssTask, jsTask);