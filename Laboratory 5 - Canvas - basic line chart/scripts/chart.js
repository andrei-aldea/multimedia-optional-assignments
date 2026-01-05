window.onload = function() {
    let canvas = document.getElementById('chartCanvas');
    let context = canvas.getContext('2d');

    let width = canvas.width;
    let height = canvas.height;

    let xIncrement = 150;
    let yIncrement = 100;
    let valueIncrement = 20;
    let textOffset = 5;

    let data = [];

    function drawVerticalLines()
    {
        context.strokeStyle = 'gray';
        context.lineWidth = 1;
        
        for(let i = 0; i< width; i += xIncrement)
        {
            context.beginPath();
            context.moveTo(i, 0);
            context.lineTo(i, height);
            context.stroke();
        }
    }

    function drawHorizontalLines()
    {
        context.strokeStyle = 'gray';
        context.lineWidth = 1;

        for (let i = 0; i < height; i += yIncrement)
        {
            context.beginPath();
            context.moveTo(0, i);
            context.lineTo(width, i);
            context.stroke();
        }
    }

    function drawChart()
    {
        context.strokeStyle = 'green';
        context.lineWidth = 5;

        context.beginPath();
        context.moveTo(0, height - data[0]);

        for (let i = 1; i < data.length; i++)
        {
            context.lineTo(i * valueIncrement, height - data[i]);
        }

        context.stroke();
    }

    function drawVerticalLabels()
    {
        for (let i = 0; i < height; i += yIncrement)
        {
            context.strokeText(height - i, textOffset, i + 2 * textOffset);
        }
    }

    function drawHorizontalLabels()
    {
        for (let i = 0; i < width; i+=xIncrement)
        {
            context.strokeText(i, i + textOffset, height - textOffset);
        }
    }

    function generateRandomNumber()
    {
        return parseInt(Math.random() * height);
    }

    function generateData()
    {
        for (let i = 0; i <= width; i+= valueIncrement)
        {
            data[i/valueIncrement] = generateRandomNumber();
        }
    }

    function draw()
    {
        context.clearRect(0, 0, width, height);
        drawVerticalLines();
        drawHorizontalLines();
        drawVerticalLabels();
        drawHorizontalLabels();
        drawChart();
    }

    function generateNewValue()
    {
        let newValue = generateRandomNumber();
        data.push(newValue);
        data.shift();
    }

    setInterval(function() {
        generateNewValue();
        draw();
    }, 1000)

    generateData();
    draw();
}