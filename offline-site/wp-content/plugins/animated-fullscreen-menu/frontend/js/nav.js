/*!
  * Scripts for navigation Table and related
  *
  *
  */

(function(){

	var transition = false; /*flag to check if the transition is happening*/
	var $ = jQuery;
	// Check if it should create a close button on the menu or not
	const render_close_button = $('.added-afsmenu-toggler, .animatedfsmenu-navbar-toggler__block').length;
  
	  
	$(document).on("click", 'button.animatedfsmenu-navbar-toggler', function(e){
	  e.preventDefault();
	  //navItens();
	  if ( transition ){
		return false;
	  }
	  if(window.afsmenu_render_video){
		  afsmenu_render_video();
	  }
	  transition = true;
  
  
	  var navbar = $(".animatedfsmenu");
  
		navbar.toggleClass("navbar-expand-md");
  
		navbar.toggleClass('d-flex');
	  if ( $(".navbar-collapse").hasClass('opacity-1-trans') ){
		$(".navbar-collapse").removeClass('opacity-1-trans'); /* remove opacity on links menu */
		transition = false;
   
	  } else {
		setTimeout(function (){
		  $(".navbar-collapse").addClass('opacity-1-trans'); /* add opacity on links menu */
		  transition = false;
		  if (typeof obj === 'afs_owl_cart') { 
			afs_owl_cart();
		  }
  
		},800);
	  }
	  
	  
	  closeAFSmenu();
  
	});
  
	$('body').on('click', '.afsmenu__close', function(e){
	  e.preventDefault();
	  e.stopPropagation();
	  $(this).closest('li').removeClass('has-children__on');
	  $(this).remove();
	  $('#afsmenu_video').remove();
	
	});
  
	$('body').on('click', '.afsmenu > .afs-menu-item-has-children:not(.has-children__on), .animatedfsmenu.afsmenu-sub-level-activated  .afs-menu-item-has-children:not(.has-children__on)', function(e){
	  e.stopPropagation();
	  if( ! $(this).find('.afsmenu__close').length > 0 ){
		$(this).find('>a').append('<div class="afsmenu__close">x</div>');
	  }
  
	  if( ! $(this).hasClass('has-children__on') && ! $(this).find('.sub-menu').is(':visible') ){
		  e.preventDefault();
  
		  $(this).addClass('has-children__on');
		  return;
		} 
		
		
  
	  });
  
	  $('body').on('click', '.animatedfsmenu__anchor .afsmenu > .afs-menu-item-has-children.has-children__on, .afsmenu > li:not(.afs-menu-item-has-children)', function(e){
		$(".animatedfsmenu").removeClass("navbar-expand-md");
		closeAFSmenu();
  
	  });
   
	  
		$(document).scroll(function() {
		  if(afsmenu.autohide_scroll){
			console.log('afsmenu:autohide_scroll');
			$('.navbar-expand-md .animatedfsmenu-navbar-toggler').click();
		  }
		});
  

		// window load
		$(window).on('load', function() {
			// If the user is using a block to render the menu, move the menu wrapper next to the toggler
			if( $('.animatedfsmenu-navbar-toggler__block').length ) {
				// clone .animatedfsmenu and insert after .animatedfsmenu-navbar-toggler__block
				$('body > .animatedfsmenu .animatedfsmenu-navbar-toggler').remove();
				let clone_menu = $('.animatedfsmenu').clone();
				$(clone_menu).insertAfter('.animatedfsmenu-navbar-toggler__block');
				$('body > .animatedfsmenu').remove();
				// remove .animatedfsmenu-navbar-toggler (not the block)
				
			}
		});
	
  
	})();
  
  function closeAFSmenu() {
	jQuery('.animatedfsmenu-navbar-toggler .top').toggleClass('top-animate');
	jQuery('.animatedfsmenu-navbar-toggler .bot').toggleClass('bottom-animate');
	jQuery('.animatedfsmenu-navbar-toggler .mid').toggleClass('mid-animate');
	
	if(!afsmenu.autohide_scroll){
	  jQuery('body').toggleClass('afsmenu__lockscroll');
	}
  
  }