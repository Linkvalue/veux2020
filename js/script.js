paper.install(window);

window.onload = function() {
    var tool = new paper.Tool();

    // The amount of points in the path:
    var nbPoint = 10;
    var handLeft;
    var handRight;
    var hand;
    var initT;

    var canvas = document.getElementById('canvas');
    var canvasWidth, canvasHeight;

    canvas.addEventListener("touchstart", handleStart, false);
    canvas.addEventListener("touchend", handleEnd, false);
    //canvas.addEventListener("touchcancel", handleCancel, false);
    canvas.addEventListener("touchmove", handleMove, false);

    paper.setup(canvas);

    // The distance between the points:
    var length = 10;

    var strokeWidthMin = 80;
    var strokeWidthMax = 80;
    var offsetHandX = 100;

    var configPath = new Path({
        strokeColor: '#FEB507',
        strokeWidth: strokeWidthMin,
        strokeCap: 'round'
    });

    var circleL,circleR;

    var pathL, pathR;


    var origin, originL, originR;
    var initCheckPosition;
    var mouse = { 'pos' : new Point(0,0), 'state': "idle" };

    // state
    var systemState = 'init'; // 0: init - 1: drag - 2: check - 3: resetPos - 4: final

    var isInit = true;
    var helperStatus = 'init'; // init - timerOn - helperOn - helperOff  
    var handHelperTimerOut,handHelperTimerIn;

    //Physics
    var gravity = 30.0;
    var mass = 2.0;
    var initPosX = 200;

    // bodyMovin
    var containerHandLeft, containerHandRight;
    var animLeft, animRight, animCheck, animNewYear;

    var tweenHandUp, tweenHandDown;

    //initialize confettis
    confettis = new confetti();
    confettis.SetGlobals();
    confettis.InitializeConfetti();
    
    /*
    #####
    UPDATE
    #####
    */

    view.onFrame = function(event) {
        // 0: init - 1: drag - 2: resetPos - 3: check - 4: final
        switch (systemState) {
          case 'init':
            init();
          break;
          case 'idle':
            if(helperStatus == 'init') {
                clearTimeout(handHelperTimerOut);
                handHelperTimerIn = setTimeout(function () { helperStatus = 'helperOn'; }, 5000);
                helperStatus = 'timerOn';
            }
            if(helperStatus == 'helperOn') handHelper(event.time)
            if(helperStatus =='timerOn') moveHand(origin, true);
            testDrag();
          break;
          case 'drag':
            reinitTimer();
            mouse.state =='down' ? moveHand(mouse.pos, false) : systemState = 'idle';
            testCroisementMain();
          break;
          case 'resetPos':
            moveHand(initCheckPosition, true, function(){ systemState = 'check'});
          break;
          case 'check':
            playAnimCheck();
          break;
          case 'final':
            var v = oscillateHand(Number.parseFloat(event.time).toFixed(3),canvasHeight/15,2);
            moveHand(new Point(canvasWidth/2, Number.parseFloat(v) + canvasHeight/2),false);
          break;
          case 'resize':
            resize();
          break;
          default:
            console.log('Sorry, we are out of ' + expr + '.');
        }
        swingPoint();
    }



    function handHelper(t){
        if(helperStatus == 'helperOn') { 
            clearTimeout(handHelperTimerIn);
            handHelperTimerOut = setTimeout(function(){ helperStatus = 'init'; initT = -1; },500);
        }
        var v = oscillateHand(Number.parseFloat(t).toFixed(3),50,15);
        var pX;
        hand=='left' ? pX = handLeft[0].point.x : pX = handRight[0].point.x; 
        moveHand(new Point(pX, Number.parseFloat(v)+canvasHeight/2),false);
        
    }

    function clearTimer(){
        clearTimeout(handHelperTimerOut);
        clearTimeout(handHelperTimerIn);
    }

    function reinitTimer(){
        if(helperStatus != 'isPass' ){
            helperStatus = 'init';
            initT = -1;
            clearTimer();
        }
    }
    /*
    #####
    TOOL
    #####
    */
    function init(){
        clearTimer();
        initCanvas();
        initBodyMovin();
        initPath();
        confettis.resize();
        initT = -1;
        hand = 'left';
        systemState = 'idle';
    }

    function resize(){
        confettis.DeactivateConfetti();
        reinitTimer();
        init();
    }

    function initCanvas(){
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        nbPoint = parseInt(canvasWidth/150);

        view.viewSize = [canvasWidth, canvasHeight];
        
        if(pathL) pathL.remove();
        if(pathR) pathR.remove();
        if(circleR) circleR.remove();
        if(circleL) circleL.remove();

        pathL = new Path({});
        pathL.copyAttributes(configPath);

        pathR = new Path({});
        pathR.copyAttributes(configPath);
        circleL = new Path.Circle(new Point(0, 0), 20);
        circleL.fillColor = '#123D5E';
        circleR = new Path.Circle(new Point(0, 0), 20);
        circleR.fillColor = '#123D5E';

        initCheckPosition = new Point(canvasWidth/2, canvasHeight/2);
    }

    function initPath(){
        //origin = view.center / [10, 1];
        handLeft = [nbPoint];
        handRight = [nbPoint];
        origin = view.center;
        origin.x = 0;

        for (var i = 0; i < nbPoint; i++){
            var posL = new Point(origin.x + (nbPoint-i-2) * length, origin.y);
            var posR = rightPoint(posL);
            var pR, pL;
            if(i==0){
                pL = new Spring2D(posL, mass, 0, 1);
                pR = new Spring2D(posR, mass, 0, -1);
                moveHtmlHand(posL,1);
            }else{
                pL = new Spring2D(posL, mass, gravity, 1);
                pR = new Spring2D(posR, mass, -gravity, -1);
            }
            handLeft[i] = pL;
            handRight[i] = pR;

            pathL.add(handLeft[i].pointOffset);
            pathR.add(handRight[i].pointOffset);
        }
        origin.x += initPosX;
        originL = origin.clone();
        originR = rightPoint(originL);
    }
    function oscillateHand(t, amplitude, frequence){
        if(initT == -1) initT = t;
        var value = Math.sin((t-initT)*frequence) * amplitude;
        v = value.toFixed(0);
        return v;
    }

    function moveHand(pos, anim, succeedFunction){
        var pT;
        hand == 'left' ? pT = handLeft[0].point : pT = handRight[0].point;
        if(isInZone(pos,pT,0.01)){
            anim = false;
            if(succeedFunction) succeedFunction();
        }
        if(hand == 'left'){
           anim ? handLeft[0].update(pos) : handLeft[0].updatePoint(pos);
           pathL.firstSegment.point = handLeft[0].pointOffset;
           moveHtmlHand(handLeft[0].point, 1)
        }
        if(hand == 'right'){
            anim ? handRight[0].update(pos) : handRight[0].updatePoint(pos);
          pathR.firstSegment.point = handRight[0].pointOffset;
          moveHtmlHand(handRight[0].point,-1);
        } 
    }

    function swingPoint(){
        for(var i=0; i<nbPoint - 1; i++){
            if(hand =='left') handLeft[i+1].update(handLeft[i].point);
            if(hand =='right') handRight[i+1].update(handRight[i].point);
        }
        hand == 'left' ? updateOtherHand(handLeft,handRight,-1) : updateOtherHand(handRight,handLeft,1); 
        updatePath();
    }

    // direction : left -1 ----- right 1
    function updateOtherHand(origin, toUp, dir){
        for(var i=0; i<nbPoint; i++){
            var p = origin[i].point;
            var newP = new Point(canvasWidth - p.x, canvasHeight - p.y );
            if(systemState == 'final'){
                newP.y =  p.y;
            }
            toUp[i].updatePoint(newP); 
            //pathR.segments[i].point = newP;
        }
        
    }

    function updatePath(){
        for(var i=0; i<nbPoint; i++){
            pathL.segments[i].point = handLeft[i].pointOffset;

            pathR.segments[i].point = handRight[i].pointOffset; 
        }

        circleL.position = handLeft[0].pointOffset;
        circleR.position = handRight[0].pointOffset;

        pathR.smooth({ type: 'continuous' });
        pathL.smooth({ type: 'continuous' });
        var sW = map_range(handLeft[0].point.x, initPosX, canvasWidth/2, strokeWidthMin, strokeWidthMax);
        pathL.strokeWidth = pathR.strokeWidth = circleR.radius = circleL.radius = sW;
        circleL.smooth();
        circleR.smooth();
    }

    function rightPoint(point){
        var newP = new Point(canvasWidth-point.x,canvasHeight-point.y);
        return newP;
    }

    function testCroisementMain(){
        testCroisement(
            handLeft[0].point,
            handRight[0].point,
            100,
            function(){
                systemState = 'resetPos';
            }
        );
    }

    function testDrag(){
        testCroisement(
            handLeft[0].point, mouse.pos, 100,
            function(){
                if(mouse.state == 'down'){
                    hand = 'left';
                    origin = originL;
                    moveHand(mouse.pos, false);
                    systemState = 'drag';
                }
            }
        );
        testCroisement(
            handRight[0].point, mouse.pos, 100,
            function(){
                if(mouse.state == 'down'){
                    hand = 'right';
                    origin = originR;
                    moveHand(mouse.pos, false);
                    systemState = 'drag';
                }
            }
        );
    }

    function testCroisement(pOne, pTwo, precision, functionOn, functionOff){
        var t = isInZone(pOne,pTwo,precision);
        if(t){
            if(functionOn) functionOn();
            return true;
        }
        else{
            if(functionOff) functionOff();
        }
        return false;
    }

    function isInZone(pOne, pTwo, precision){
        var p = pOne.clone();
        var d = p.getDistance(pTwo);
        if( d <  precision){
            return true;
        }
        return false;
    }

    function map_range(value, low1, high1, low2, high2) {
        if(value > high1){
            value = high1;
        }else if(value < low1){
            value = low1;
        }
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }
    /*
    #####
    INTERACTION
    #####
    */
    canvas.onmousemove = event => {
        //event.preventDefault();
        //event.stopPropagation();
        updateMouse(event);
    }

    canvas.onmousedown = event => {
        //event.preventDefault();
        //event.stopPropagation();
        updateMouse(event)
        mouse.state = 'down';
        //pathL.selected = true;
        //pathL.strokeColor = '#e08285';
    }

    canvas.onmouseup = event => {
        //event.preventDefault();
        //event.stopPropagation();
        mouse.state = 'up';
        if(systemState == 'drag') systemState = 'idle';
    }

    function handleMove(event){
        event.preventDefault();
        event.stopPropagation();
        updateMouse(event.touches[0]);
    }

    function handleStart(event){
        event.preventDefault();
        event.stopPropagation();
        updateMouse(event.touches[0]);
        mouse.state = 'down';
    }

    function handleEnd(event){
        event.preventDefault();
        event.stopPropagation();
        mouse.state = 'up';
        if(systemState == 'drag') systemState = 'idle';
    }

    function updateMouse(e){
        var x = e.clientX;
        var y = e.clientY;
        if(systemState == 'drag'){
            if(hand=='left' && x > canvasWidth*2/3){
                x = canvasWidth*2/3;
            }
            if(hand=='right' && x < canvasWidth*1/3){
                x = canvasWidth*1/3;
            }
        }
        mouse.pos.x = x;
        mouse.pos.y = y;
    }

    /*
    tool.onMouseMove(event){
        mouse.pos = event.point;
        //mouse.state = 'move';
    }
    tool.onMouseDown = function(event){
        //pathL.fullySelected = true;
        //pathL.strokeColor = '#e08285';
        mouse.pos = event.point;
        mouse.state = 'down';
    }

    tool.onMouseUp = function(event){
        //pathL.fullySelected = false;
        //pathL.strokeColor = '#4730D8';
        mouse.state = 'up';
        if(systemState == 'drag') systemState = 'idle';
    }*/

    view.onResize = function(event) {
        systemState='resize';
    }

    /*
    #####
    CLASS
    #####
    */

    function Spring2D(point, m, g, dir) {
        this.update = function(targetPoint){
            this.force = targetPoint.subtract(this.point);
            this.force = this.force.multiply(this.stiffness);
            this.force = this.force.add(this.gravity);

            this.acc = this.force.divide(this.mass);
            this.vit = this.vit.add(this.acc);
            this.vit = this.vit.multiply(this.damping);
            this.point = this.point.add(this.vit);
            this.updatePoint(this.point);
        }
        this.updatePoint = function (point){
            this.point = point.clone();
            this.pointOffset = this.point.clone();
            this.pointOffset.x -= offsetHandX*dir; 
        }
        this.point, this.pointOffset;
        this.updatePoint(point);
        this.vit = new Point(0,0);
        this.mass = m;
        this.gravity = new Point(-g,0);
        this.radius = 30;
        this.stiffness = 0.2;
        this.damping = 0.7;
        var _this = this;
        
    }

    /*
    #####
    BODY MOVIN'
    #####
    */
    function initShowingEl(){
        containerHandLeft.classList.remove('hide');
        containerHandRight.classList.remove('hide');
        containerCheck.classList.add('hide');
        containerNewYear.classList.add('hide');
    }

    function initBodyMovin(){
        
        if(animCheck) animCheck.destroy();
        //if(animNewYear) animNewYear.destroy();
        if(animLeft) animLeft.destroy();
        if(animRight) animRight.destroy();

        containerHandLeft = document.getElementById('handLeft');
        /*animLeft = bodymovin.loadAnimation({
          wrapper: containerHandLeft,
          animType: 'svg',
          autoplay: false,
          loop: true,
          path: './data/bee-fiying.json'
        });*/
        
        containerHandRight = document.getElementById('handRight');
        /*animRight = bodymovin.loadAnimation({
          wrapper: containerHandRight,
          animType: 'svg',
          autoplay: false,
          loop: true,
          path: './data/bee-fiying.json'
        });*/

        containerCheck = document.getElementById('check');
        
        animCheck = bodymovin.loadAnimation({
          wrapper: containerCheck,
          animType: 'svg',
          autoplay: false,
          loop: false,
          path: './data/check.json'
        });
        
        containerNewYear = document.getElementById('newYearHandler');
        /*animNewYear = bodymovin.loadAnimation({
          wrapper: containerNewYear,
          animType: 'svg',
          autoplay: false,
          loop: true,
          path: './data/markus.json'
        });*/
        initShowingEl();
    }

    function playHand(){
        //animLeft.play();
        //animRight.play();
    }

    function stopHand(){
        //animLeft.stop();
        //animRight.stop();
    }

    function stopAnim(anim){
        anim.goToAndStop(0);
    }

    function playAnimCheck(){
        //animLeft.destroy();
        //animRight.destroy();

        containerHandLeft.classList.add('hide');
        containerHandRight.classList.add('hide');
        containerCheck.classList.remove('hide');

        containerNewYear.classList.remove('hide');
        moveHtmlCheckAnim();
        //animNewYear.play();
        animCheck.play();
        if(isInit) confettis.StartConfetti();
        isInit ? isInit = false : confettis.RestartConfetti();
        
        systemState = 'final';
    }
    function moveHtmlCheckAnim(){
        containerCheck.style.top = (initCheckPosition.y - containerCheck.offsetHeight/2)+"px";
        containerCheck.style.left = (initCheckPosition.x - containerCheck.offsetWidth/2 )+"px";
    }

    function moveHtmlHand(point,dir){
        if(systemState == 'final'){
            containerCheck.style.top = (point.y - containerCheck.offsetHeight/2)+"px";
            containerCheck.style.left = (point.x - containerCheck.offsetWidth/2)+"px";
        }else{
            containerHandLeft.style.top   = ((1-dir)*canvasHeight/2 + dir * point.y - containerHandLeft.offsetHeight/2)+"px";
            containerHandLeft.style.left  = ((1-dir)*canvasWidth/2 + dir * point.x - containerHandLeft.offsetWidth/2 )+"px";
            containerHandRight.style.top  = (Math.abs(-1-dir)*canvasHeight/2 - dir*point.y - containerHandRight.offsetHeight/2)+"px";
            containerHandRight.style.left = (Math.abs(-1-dir)*canvasWidth/2 - dir*point.x - containerHandRight.offsetWidth/2)+"px";
        }
    }
}
