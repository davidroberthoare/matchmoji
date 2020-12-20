// define sounds
var snd_success = new Howl({src: ['sounds/success.ogg'], volume: 0.2,});
var snd_error = new Howl({src: ['sounds/error.ogg'], volume: 0.2,});
var snd_flip = new Howl({src: ['sounds/flip.ogg'], volume: 0.2,});


const endpoint = `${window.location.protocol.replace("http", "ws")}//${
  window.location.hostname
}`;
var client = new Colyseus.Client(endpoint);
var url = new URL(window.location.href);
var sessionid = url.searchParams.get("session");
var room;

var ROLLING = false;

// Connect to the chatroom
client
  .joinOrCreate("mygame", { session: sessionid })
  .then(myroom => {
    room = myroom;
    console.log(room.sessionId, "joined", room.name);
    
    room.onMessage("do_roll", data => {
      ROLLING=true;
      console.log("do_roll data", data);
      setTimeout(function(){
        doRoll();
      }, 500)
    });
  
    room.onMessage("reset", data => {
      snd_error.play();
    });
  
    room.onMessage("success", data => {
      snd_success.play();
    });
  
    room.onMessage("win", data => {
      console.log("got WIN messsage")
      $("#winner").show();
    });
  
    room.state.tiles.onAdd = (tile, key) => {

        tile.onChange = function(changes) {
            changes.forEach(change => {
                console.log("tile:", this, key);
                console.log(change.field, change.value);
              // console.log(change.previousValue);
              if(change.field=="state" || change.field=="text"){
                if(ROLLING===false){
                  update_tile(key, change.field, change.value);
                }
              }
            })
        };
    };
    
  
      
  })
  .catch(e => {
    console.log("JOIN ERROR", e);
  });


function update_tile(key, type, newValue){
  console.log("updating tiles", type, key, newValue );
  var $tile =$(".etile[data-id='"+key+"']");
  if(type=='text'){
    $tile.text( newValue );
  }
  
  else if(type=='state'){
    if(newValue=='flipped'){
      snd_flip.play();
      $tile.addClass("anim_flipped");
      setTimeout(function(){
        $tile.find('.overlay').addClass('flipped');
      },250);
      
    }
    
    if(newValue=='hidden'){
      animateCSS(".etile[data-id='"+key+"']", 'bounce').then((message) => {
        animateCSS(".etile[data-id='"+key+"']", 'flipOutY').then((message) => {
          $tile.addClass('hidden');
        });
      });
    }
    
    if(newValue=='default'){
      // animateCSS(".etile[data-id='"+key+"']", 'headShake').then((message) => {
      $tile.removeClass("anim_flipped");
      setTimeout(function(){
        $tile.find('.overlay').removeClass('flipped').removeClass('hidden');
      },250);
      // });
      
    }
    else{
      //not sure...
    }
  }
}

function doRoll(){
  console.log("resetting tiles");
  $("#winner").hide();
  $("#etile_container").empty();
  
  var back_class = 'has-background-success';
  if(room.state.tiles.length>12) back_class = 'has-background-warning';
  if(room.state.tiles.length>20) back_class = 'has-background-danger';
  
  for(var i=0; i<room.state.tiles.length; i++){
    // console.log("creating tile", i);
    var $tile = $('<div class="etile animate__animated" data-id="'+room.state.tiles[i].id+'">'+room.state.tiles[i].text+'<span class="overlay '+back_class+'">'+(parseInt(room.state.tiles[i].id)+1)+'</span></div>'); 
    $("#etile_container").append($tile);
  }
  
  ROLLING=false;
  
  resizeTiles();
}



var randomCheckCount = 0;
function getRandomPosition(die){
  var rand_top = randomIntFromInterval(0, container_height-dice_size);
  var rand_left = randomIntFromInterval(0, container_width-dice_size);

  // console.log("shuffling to position: ", rand_top, rand_left);
  die.css("top", rand_top).css("left", rand_left);

  //check overlap, if so, redo...
  if(die.collidesWith(".dice").length >0 && randomCheckCount<20) {
    randomCheckCount+=1;  //increase the checkcount by 1, and try again
    getRandomPosition(die);
  }else{
    randomCheckCount=0;  //reset the check count
  }
}


function resetPositions(){
  console.log("resetting positions");
  $(".dice").each(function(){
    var data = $(this).data();
    console.log("resetting position to", data);
    $(this).css({
        'left': data.originalLeft,
        'top': data.origionalTop
    });
  });
}



// DOCUMENT READY
$( function() {
  
  resizeTiles();
  
  $("#etile_container").on("click", ".etile", function(){
    var id = $(this).data('id');  
    console.log("clicked on tile", id);
    room.send('flip_tile', id);
  });
  
} );



$(".roll_btn").click(function(){
  if(confirm("Reset and Shuffle?")){
    ROLLING=true;
    room.send("roll", $(this).data('num'));
  }
})

window.onresize = function(event) {
  resizeTiles()
};

window.addEventListener("orientationchange", function(event) {
  console.log("the orientation of the device is now " + event.target.screen.orientation.angle);
  resizeTiles()
});

function resizeTiles(){
  if(room && room.state && room.state.tiles && room.state.tiles.length>0){
    var numTiles = room.state.tiles.length;
    var xfactor = 10;
    var yfactor = 10;
    
    if(numTiles==12){
      xfactor = 22;
      yfactor = 30;
    }
    else if(numTiles==20){
      xfactor = 16;
      yfactor = 20;
      
    }
    else if(numTiles==32){
      xfactor = 11;
      yfactor = 18;
    }
    
    // factor=factor-2;  //margin
    console.log("resizing to factor", xfactor, yfactor);
    $(".etile").css('width', xfactor+"%").css('height', yfactor+"%");
    
    //then resize fonts
      console.log("resizing fonts");
      var tile_height = $(".etile").first().height();
      $(".etile").css('font-size', (tile_height * 0.6)+"px");
  }
}


function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}


jQuery.fn.sortDivs = function sortDivs() {
    $("> div", this[0]).sort(dec_sort).appendTo(this[0]);
    function dec_sort(a, b){ return ($(b).data("sort")) < ($(a).data("sort")) ? 1 : -1; }
}



const animateCSS = (element, animation, prefix = 'animate__') => {
  // We create a Promise and return it
  return new Promise((resolve, reject) => {
    const animationName = `${prefix}${animation}`;
    const node = document.querySelector(element);
    
    if(node && node.classList){
      node.classList.add(`${prefix}animated`, animationName);
  
      // When the animation ends, we clean the classes and resolve the Promise
      function handleAnimationEnd() {
        node.classList.remove(`${prefix}animated`, animationName);
        resolve('Animation ended');
      }
  
      node.addEventListener('animationend', handleAnimationEnd, {once: true});
    }
  });
}


function makeid(length) {
   var result           = '';
   var characters       = 'abcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}