import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';

import Expo from 'expo';
import Toast from 'react-native-easy-toast';

import Firebase from '../util/Firebase';
import * as firebase from 'firebase';

import Colors from '../constants/Colors';

import InlineInputField from '../components/InlineInputField';
import MultilineInputField from '../components/MultilineInputField';

const { width, height } = Dimensions.get('window');

class BoatModalButton extends React.Component {
  render() {
    return (
      <View style={styles.boatModalButtonContainer}>
        <TouchableOpacity onPress={() => this.props.onPress()}>
          <View style={styles.boatModalButton}>
            <Text style={styles.boatModalButtonText}>
              {this.props.text}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }
}

class AddBoatScreen extends React.Component {
  static navigationOptions = ({navigation}) => ({
    gesturesEnabled: true,
    title: navigation.state.params.boatKey ? 'EDIT A BOAT' : 'ADD A BOAT',
    headerTitleStyle: {
      color: Colors.tabIconSelected,
      fontFamily: 'CarterSansPro-Bold',
      fontSize: 18,
    },
    headerStyle: {
      marginTop: Platform.OS === 'ios' ? 0 : 20,
    },
  })

  state = {
    image: null,
    inputValues: {}
  }

  closeButton = (
    <Image
      source={require('../assets/images/X.png')}
      style={styles.closeButton}
    />
  );
  componentDidMount() {
    this._getCurrentBoat();

  }

  _inputField(label, fieldLabel, extraProps) {
    return (
      <InlineInputField
        label={label}
        onChangeText={text => this._onTextInput(fieldLabel, text)}
        value={this.state.inputValues[fieldLabel]}
        {...extraProps}
      />
    );
  }

  _onTextInput(field, text) {
    const state = this.state.inputValues;
    state[field] = text;
    this.setState({ inputValues: state });
  }

  _pickImage = async () => {
    let result = await Expo.ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
    });

    if (!result.cancelled) {
      this.setState({ image: result.uri });
    }
  }
  _getCurrentBoat = async () => {
    const boatKey = this.props.navigation.state.params.boatKey;
    const userId = Firebase.getAuthenticatedUser().uid;
    console.log(boatKey);
    if(boatKey) {
      await firebase.database().ref(`users/${userId}/boats/${boatKey}`).once('value', data => {
        this.setState({
          image: data.val().imageURL,
          inputValues: {
            description: data.val().description,
            make: data.val().make,
            model: data.val().model,
            year: data.val().year
          }
        });
        console.log(data.val());
      });
      // console.log(boat);
    }
  }
  _submitBoat = async () => {
    let { image } = this.state;
    const data = this.state.inputValues;
    const { make, model, year, description } = data;
    if (!image) {
      this.refs.toast.show('Please include an image of your boat', 5000);
      return;
    }
    await Firebase.addBoat(this.state.inputValues, image);
    this.setState({ image: null, inputValues: {} });
    this.props.navigation.goBack();
  }
  _updateBoat = async (key) => {
    console.log(key);
    let { image } = this.state;
    const data = this.state.inputValues;
    const { make, model, year, description } = data;
    if (!image) {
      this.refs.toast.show('Please include an image of your boat', 5000);
      return;
    }
    await Firebase.updateBoat(key, this.state.inputValues, image);
    this.setState({ image: null, inputValues: {} });
    this.props.navigation.goBack();
  }

  _renderInnerContents() {
    let { image } = this.state;
    const boatKey = this.props.navigation.state.params.boatKey;

    return (
      <ScrollView contentContainerStyle={styles.modal}>
        <StatusBar hidden={false} />
        {image &&
          <View>
            <Image source={{ uri: image }} style={styles.boatImage} />
            <View style={styles.imageContentsContainer}>
              <TouchableOpacity onPress={() => this.setState({ image: null })}>
                {this.closeButton}
              </TouchableOpacity>
            </View>
          </View>
        }
        {this._inputField('MAKE', 'make')}
        {this._inputField('MODEL', 'model')}
        {this._inputField('YEAR', 'year', { keyboardType: 'numeric' })}
        <MultilineInputField
          label="DESCRIPTION"
          onChange={this._onTextInput.bind(this, 'description')}
          value={this.state.inputValues['description']}
        />
        <BoatModalButton
          onPress={this._pickImage}
          text="ADD IMAGE"
        />
        <BoatModalButton
          onPress={() => boatKey ? this._updateBoat(boatKey) : this._submitBoat()}
          text="SUBMIT CHANGES"
        />
        <Toast ref="toast" position="bottom" />
      </ScrollView>
    );
  }

  render() {
    return (
      <View>
        {Platform.OS === 'ios' &&
          this._renderInnerContents()
        }
        {Platform.OS !== 'ios' &&
          this._renderInnerContents()
        }
      </View>
    );
  }
}


const styles = StyleSheet.create({
  modal: {
    // flex: 1,
    padding: 15,
    backgroundColor: '#fff',
    height: height,
  },
  boatImage: {
    // position: 'absolute',
    width: 280,
    height: 120,
    marginBottom: 10,
    alignSelf: 'center',
    borderRadius: 5,
  },
  boatModalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  boatModalButtonText: {
    fontSize: 12,
    color: '#fff',
    fontFamily: 'Lato-Bold',
  },
  boatModalButton: {
    backgroundColor: Colors.tabIconSelected,
    paddingVertical: 10,
    alignItems: 'center',
    width: 200,
    marginBottom: 5,
  },
  imageContentsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  closeButton: {
    width: 16,
    height: 16,
    margin: 3,
  },
});

export default AddBoatScreen;
